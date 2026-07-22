import { supabase } from '../lib/supabaseClient';
import type { Lead, LeadCrossExecEvent } from '../types';

export type LeadSortField = 'createdAt' | 'name' | 'rut';
export type LeadSortDirection = 'asc' | 'desc';

export interface LeadPageQuery {
  page: number;
  pageSize: number;
  search?: string;
  listId?: number | null;
  status?: string | null;
  dateFilter?: string;
  sortField?: LeadSortField;
  sortDirection?: LeadSortDirection;
  deleted?: boolean;
}

export interface LeadPageRowResult {
  rows: LeadRow[];
  filteredCount: number;
  totalCount: number;
}

interface ForgottenLeadCountRow {
  filtered_count: number | null;
  total_count: number | null;
}

export interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  rut: string | null;
  status: string | null;
  score: number | null;
  lista_ids: number[] | null;
  notes: string | null;
  scheduled_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  assigned_at: string | null;
  first_contacted_at: string | null;
  closed_at: string | null;
  estimated_value: number | null;
  metadata: Lead['metadata'];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LeadCrossExecEventRow {
  id: string;
  lead_id: string;
  related_lead_id: string;
  event_kind: LeadCrossExecEvent['eventKind'];
  counterpart_captured_at: string;
  matched_by: string[] | null;
  is_read: boolean | null;
  created_at: string;
}

export interface LeadIdentityRow {
  id: string;
  rut: string | null;
  phone: string | null;
}

export const LEAD_SELECT =
  'id, user_id, name, phone, email, company, rut, status, score, lista_ids, notes, scheduled_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, assigned_at, first_contacted_at, closed_at, estimated_value, metadata, created_at, updated_at, deleted_at';

export const CROSS_EXEC_EVENT_SELECT =
  'id, lead_id, related_lead_id, event_kind, counterpart_captured_at, matched_by, is_read, created_at';

function applyLeadPageFilters(
  query: any,
  userId: string,
  params: LeadPageQuery,
) {
  let nextQuery = query.eq('user_id', userId);

  if (params.deleted) {
    nextQuery = nextQuery.not('deleted_at', 'is', null);
  } else {
    nextQuery = nextQuery.is('deleted_at', null);
  }

  if (params.listId !== undefined && params.listId !== null) {
    nextQuery = nextQuery.contains('lista_ids', [params.listId]);
  }

  if (params.status) {
    nextQuery = nextQuery.eq('status', params.status);
  }

  if (params.dateFilter) {
    const now = new Date();
    let cutoffIso = '';
    if (params.dateFilter === '7d') {
      cutoffIso = new Date(Date.now() - 7 * 86400000).toISOString();
    } else if (params.dateFilter === '30d') {
      cutoffIso = new Date(Date.now() - 30 * 86400000).toISOString();
    } else if (params.dateFilter === 'thisMonth') {
      cutoffIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    if (cutoffIso) {
      nextQuery = nextQuery.gte('created_at', cutoffIso);
    }
  }

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[%]/g, '');
    nextQuery = nextQuery.or(
      `name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%,company.ilike.%${escaped}%,rut.ilike.%${escaped}%`,
    );
  }

  return nextQuery;
}

function resolveLeadSort(params: LeadPageQuery): { column: string; ascending: boolean } {
  const sortField = params.sortField || 'createdAt';
  const sortDirection = params.sortDirection || 'desc';

  if (sortField === 'name') {
    return { column: 'name', ascending: sortDirection === 'asc' };
  }

  if (sortField === 'rut') {
    return { column: 'rut', ascending: sortDirection === 'asc' };
  }

  return { column: 'created_at', ascending: sortDirection === 'asc' };
}

function hasActiveLeadFilters(params: LeadPageQuery): boolean {
  return !!(
    params.search?.trim() ||
    params.listId !== undefined && params.listId !== null ||
    params.status ||
    params.dateFilter
  );
}

export async function fetchLeadRows(userId: string): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return (data ?? []) as LeadRow[];
}

export async function fetchLeadPageRows(userId: string, params: LeadPageQuery): Promise<LeadPageRowResult> {
  const safePage = Math.max(1, params.page || 1);
  const safePageSize = Math.max(1, Math.min(200, params.pageSize || 50));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const { column, ascending } = resolveLeadSort(params);
  const filtersActive = hasActiveLeadFilters(params);

  const rowsQuery = applyLeadPageFilters(
    supabase.from('leads').select(LEAD_SELECT),
    userId,
    params,
  ).order(column, { ascending }).range(from, to);

  const filteredCountQuery = applyLeadPageFilters(
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    userId,
    params,
  );

  const totalCountQuery = filtersActive
    ? params.deleted
      ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('deleted_at', 'is', null)
      : supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null)
    : null;

  const [
    { data, error },
    { count: filteredCount, error: filteredCountError },
    totalCountResult,
  ] = await Promise.all([
    rowsQuery,
    filteredCountQuery,
    totalCountQuery ?? Promise.resolve({ count: null, error: null }),
  ]);

  if (error || filteredCountError) {
    console.error('Error fetching lead page:', error);
    return { rows: [], filteredCount: 0, totalCount: 0 };
  }
  const totalCount = filtersActive ? (totalCountResult.count ?? filteredCount ?? 0) : (filteredCount ?? 0);

  return {
    rows: (data ?? []) as LeadRow[],
    filteredCount: filteredCount ?? 0,
    totalCount,
  };
}

export async function fetchForgottenLeadPageRows(params: LeadPageQuery): Promise<LeadPageRowResult> {
  const { data, error } = await supabase.rpc('list_my_forgotten_leads', {
    p_search: params.search?.trim() || null,
    p_list_id: params.listId ?? null,
    p_status: params.status ?? null,
    p_date_filter: params.dateFilter || null,
    p_sort_field: params.sortField || 'createdAt',
    p_sort_direction: params.sortDirection || 'desc',
    p_page: Math.max(1, params.page || 1),
    p_page_size: Math.max(1, Math.min(200, params.pageSize || 50)),
  });

  if (error) {
    console.error('Error fetching forgotten lead page:', error);
    return { rows: [], filteredCount: 0, totalCount: 0 };
  }

  const { data: countData, error: countError } = await supabase.rpc('count_my_forgotten_leads', {
    p_search: params.search?.trim() || null,
    p_list_id: params.listId ?? null,
    p_status: params.status ?? null,
    p_date_filter: params.dateFilter || null,
  });

  if (countError) {
    console.error('Error counting forgotten leads:', countError);
    return { rows: (data ?? []) as LeadRow[], filteredCount: 0, totalCount: 0 };
  }

  const countRow = ((countData ?? [])[0] ?? null) as ForgottenLeadCountRow | null;

  return {
    rows: (data ?? []) as LeadRow[],
    filteredCount: countRow?.filtered_count ?? 0,
    totalCount: countRow?.total_count ?? 0,
  };
}

export async function fetchDeletedLeadRows(userId: string): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as LeadRow[];
}

export async function fetchLeadIdentityRows(userId: string): Promise<LeadIdentityRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, rut, phone')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error || !data) {
    return [];
  }

  return data as LeadIdentityRow[];
}

export async function fetchLeadRowById(id: string): Promise<LeadRow | undefined> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .single();

  if (error || !data) {
    return undefined;
  }

  return data as LeadRow;
}

export async function fetchLeadRowsByList(listaId: number): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .contains('lista_ids', [listaId])
    .is('deleted_at', null);

  if (error || !data) {
    return [];
  }

  return data as LeadRow[];
}

export async function fetchCrossExecEventRowsByLeadIds(leadIds: string[]): Promise<LeadCrossExecEventRow[]> {
  const { data, error } = await supabase
    .from('lead_cross_exec_events')
    .select(CROSS_EXEC_EVENT_SELECT)
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lead cross-exec events:', error);
    return [];
  }

  return (data ?? []) as LeadCrossExecEventRow[];
}

export async function updateLead(id: string, payload: Partial<LeadRow>): Promise<void> {
  const { error } = await supabase.from('leads').update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function createLead(payload: Partial<LeadRow>): Promise<string> {
  const { data, error } = await supabase.from('leads').insert(payload).select('id').single();
  if (error || !data) {
    throw error || new Error('No se pudo crear el lead');
  }

  return data.id as string;
}

export async function deleteLeadById(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function purgeDeletedLeadRows(userId: string, cutoff: string): Promise<number> {
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .lt('deleted_at', cutoff)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    return 0;
  }

  return data?.length || 0;
}

export async function importLeadRows(rows: Array<Partial<LeadRow>>): Promise<void> {
  const { error } = await supabase.from('leads').insert(rows);
  if (error) {
    console.error('Error importando leads:', error);
  }
}

export async function fetchLeadListIds(leadId: string): Promise<number[]> {
  const { data } = await supabase.from('leads').select('lista_ids').eq('id', leadId).single();
  return data?.lista_ids || [];
}
