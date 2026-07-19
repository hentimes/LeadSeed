import { supabase } from '../lib/supabaseClient';
import type { Lead, LeadCrossExecEvent } from '../types';

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

export const LEAD_SELECT =
  'id, user_id, name, phone, email, company, rut, status, score, lista_ids, notes, scheduled_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, assigned_at, first_contacted_at, closed_at, estimated_value, metadata, created_at, updated_at, deleted_at';

export const CROSS_EXEC_EVENT_SELECT =
  'id, lead_id, related_lead_id, event_kind, counterpart_captured_at, matched_by, is_read, created_at';

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
