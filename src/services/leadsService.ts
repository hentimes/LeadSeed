import type { Lead, LeadCrossExecEvent, LeadStatus } from '../types';
import { normalizePhone } from '../utils/waHelper';
import { normalizeRut } from '../utils/rutNormalizer';
import {
  createLead,
  deleteLeadById,
  fetchCrossExecEventRowsByLeadIds,
  fetchDeletedLeadRows,
  fetchForgottenLeadPageRows,
  fetchLeadIdentityRows,
  fetchLeadListIds,
  fetchLeadPageRows,
  fetchLeadRowById,
  fetchLeadRows,
  fetchLeadRowsByList,
  fetchPinnedLeads,
  importLeadRows,
  purgeDeletedLeadRows,
  type LeadIdentityRow,
  type LeadPageQuery,
  type LeadCrossExecEventRow,
  type LeadRow,
  updateLead,
} from '../repositories/leadsRepository';

const validStatuses: LeadStatus[] = ['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'];

const toTitleCase = (value?: string) => {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const compareLeadPriority = (a: Lead, b: Lead) => {
  const aPriority = a.crossExecPriorityAt || a.createdAt;
  const bPriority = b.crossExecPriorityAt || b.createdAt;
  return Date.parse(bPriority) - Date.parse(aPriority);
};

export interface LeadPageResult {
  items: Lead[];
  filteredCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
}

export const mapLeadRowToDomain = (row: LeadRow): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone || '',
  email: row.email || '',
  company: row.company || '',
  rut: row.rut || '',
  status: (row.status as LeadStatus) || 'nuevo',
  score: row.score || 0,
  listaIds: row.lista_ids || [],
  notes: row.notes || '',
  scheduledAt: row.scheduled_at || undefined,
  utmSource: row.utm_source || undefined,
  utmMedium: row.utm_medium || undefined,
  utmCampaign: row.utm_campaign || undefined,
  utmTerm: row.utm_term || undefined,
  utmContent: row.utm_content || undefined,
  assignedAt: row.assigned_at || undefined,
  firstContactedAt: row.first_contacted_at || undefined,
  closedAt: row.closed_at || undefined,
  estimatedValue: row.estimated_value || undefined,
  metadata: row.metadata || {},
  isPinned: row.metadata?.isPinned === true,
  crossExecAlerts: [],
  hasUnreadCrossExecAlert: false,
  crossExecPriorityAt: undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at || undefined,
});

const mapCrossExecEventRow = (row: LeadCrossExecEventRow): LeadCrossExecEvent => ({
  id: row.id,
  leadId: row.lead_id,
  relatedLeadId: row.related_lead_id,
  eventKind: row.event_kind,
  counterpartCapturedAt: row.counterpart_captured_at,
  matchedBy: row.matched_by || [],
  isRead: !!row.is_read,
  createdAt: row.created_at,
});

export async function attachCrossExecAlerts(leads: Lead[]): Promise<Lead[]> {
  return attachCrossExecAlertsToLeads(leads, true);
}

export async function attachCrossExecAlertsToLeads(leads: Lead[], sortByPriority = false): Promise<Lead[]> {
  const leadIds = leads.map((lead) => lead.id).filter(Boolean) as string[];
  if (leadIds.length === 0) {
    return leads;
  }

  const alertsByLeadId = new Map<string, LeadCrossExecEvent[]>();
  const rows = await fetchCrossExecEventRowsByLeadIds(leadIds);
  for (const row of rows) {
    const event = mapCrossExecEventRow(row);
    const alerts = alertsByLeadId.get(event.leadId) ?? [];
    alerts.push(event);
    alertsByLeadId.set(event.leadId, alerts);
  }

  const enriched = [...leads].map((lead) => {
    const alerts = alertsByLeadId.get(lead.id || '') || [];
    const unreadAlert = alerts.find((event) => !event.isRead);
    return {
      ...lead,
      crossExecAlerts: alerts,
      hasUnreadCrossExecAlert: !!unreadAlert,
      crossExecPriorityAt: unreadAlert?.createdAt,
    };
  });

  return sortByPriority ? enriched.sort(compareLeadPriority) : enriched;
}

export async function fetchActiveLeads(userId: string): Promise<Lead[]> {
  return attachCrossExecAlerts((await fetchLeadRows(userId)).map(mapLeadRowToDomain));
}

export async function fetchDeletedLeads(userId: string): Promise<Lead[]> {
  return attachCrossExecAlerts((await fetchDeletedLeadRows(userId)).map(mapLeadRowToDomain));
}

export async function getPinnedLeads(userId: string): Promise<Lead[]> {
  const rows = await fetchPinnedLeads(userId);
  return attachCrossExecAlerts(rows.map(mapLeadRowToDomain));
}

export async function fetchLeadPage(userId: string, params: LeadPageQuery): Promise<LeadPageResult> {
  const safePage = Math.max(1, params.page || 1);
  const safePageSize = Math.max(1, params.pageSize || 50);
  const { rows, filteredCount, totalCount } = await fetchLeadPageRows(userId, params);
  const items = await attachCrossExecAlertsToLeads(rows.map(mapLeadRowToDomain), false);

  return {
    items,
    filteredCount,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function fetchForgottenLeadPage(params: LeadPageQuery): Promise<LeadPageResult> {
  const safePage = Math.max(1, params.page || 1);
  const safePageSize = Math.max(1, params.pageSize || 50);
  const { rows, filteredCount, totalCount } = await fetchForgottenLeadPageRows(params);
  const items = await attachCrossExecAlertsToLeads(rows.map(mapLeadRowToDomain), false);

  return {
    items,
    filteredCount,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function fetchLeadById(id: string): Promise<Lead | undefined> {
  const data = await fetchLeadRowById(id);
  if (!data) {
    return undefined;
  }

  const [lead] = await attachCrossExecAlerts([mapLeadRowToDomain(data)]);
  return lead;
}

export async function fetchLeadsByList(listaId: number): Promise<Lead[]> {
  return (await fetchLeadRowsByList(listaId)).map(mapLeadRowToDomain);
}

export interface LeadIdentity {
  id: string;
  rut: string;
  phone: string;
}

function mapLeadIdentityRow(row: LeadIdentityRow): LeadIdentity {
  return {
    id: row.id,
    rut: row.rut || '',
    phone: row.phone || '',
  };
}

export async function fetchLeadIdentities(userId: string): Promise<LeadIdentity[]> {
  return (await fetchLeadIdentityRows(userId)).map(mapLeadIdentityRow);
}

export async function saveLeadForUser(userId: string, lead: Lead): Promise<string> {
  if (lead.id) {
    const existing = await fetchLeadRowById(lead.id);
    if (!existing) {
      throw new Error('Lead no encontrado');
    }

    const patch = lead as Partial<Lead>;
    const row = {
      name: patch.name !== undefined ? toTitleCase(patch.name) : existing.name,
      phone: patch.phone !== undefined ? normalizePhone(patch.phone) : (existing.phone || ''),
      email: patch.email !== undefined ? patch.email : (existing.email || ''),
      company: patch.company !== undefined ? patch.company : (existing.company || ''),
      rut: patch.rut !== undefined ? (normalizeRut(patch.rut) || patch.rut) : (existing.rut || ''),
      status: patch.status !== undefined ? patch.status : ((existing.status as LeadStatus) || 'nuevo'),
      score: patch.score !== undefined ? patch.score : (existing.score || 0),
      notes: patch.notes !== undefined ? patch.notes : (existing.notes || ''),
      lista_ids: patch.listaIds !== undefined ? patch.listaIds : (existing.lista_ids || []),
      scheduled_at: patch.scheduledAt !== undefined ? patch.scheduledAt : existing.scheduled_at,
      metadata: {
        ...(existing.metadata || {}),
        ...(patch.metadata || {}),
        isPinned: patch.isPinned !== undefined ? patch.isPinned : existing.metadata?.isPinned
      },
      user_id: existing.user_id || userId,
      updated_at: new Date().toISOString(),
    };

    await updateLead(lead.id, row);
    return lead.id;
  }

  const row = {
    name: toTitleCase(lead.name),
    phone: normalizePhone(lead.phone),
    email: lead.email,
    company: lead.company,
    rut: normalizeRut(lead.rut) || lead.rut,
    status: lead.status || 'nuevo',
    score: lead.score || 0,
    notes: lead.notes || '',
    lista_ids: lead.listaIds || [],
    scheduled_at: lead.scheduledAt,
    metadata: {
      ...(lead.metadata || {}),
      isPinned: lead.isPinned || false
    },
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  return createLead(row);
}

export async function softDeleteLead(id: string): Promise<void> {
  await updateLead(id, { deleted_at: new Date().toISOString() });
}

export async function restoreLead(id: string): Promise<void> {
  await updateLead(id, { deleted_at: null });
}

export async function permanentlyDeleteLead(id: string): Promise<void> {
  await deleteLeadById(id);
}

export async function purgeDeletedLeadsForUser(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  return purgeDeletedLeadRows(userId, cutoff);
}

export async function importLeadsForUser(
  userId: string,
  leads: (Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'listaIds' | 'status'> & { status?: string })[]
): Promise<void> {
  const rows = leads.map((lead) => {
    const rawStatus = lead.status;
    const normalizedStatus =
      rawStatus && validStatuses.includes(rawStatus.toLowerCase() as LeadStatus)
        ? (rawStatus.toLowerCase() as LeadStatus)
        : 'nuevo';

    return {
      name: toTitleCase(lead.name),
      phone: normalizePhone(lead.phone),
      email: lead.email,
      company: lead.company,
      rut: lead.rut,
      status: normalizedStatus,
      notes: lead.notes || '',
      user_id: userId,
    };
  });

  await importLeadRows(rows);
}

export async function addLeadToList(leadId: string, listaId: number): Promise<boolean> {
  try {
    const currentList = await fetchLeadListIds(leadId);
    if (currentList.includes(listaId)) {
      return false;
    }

    await updateLead(leadId, {
      lista_ids: [...currentList, listaId],
      updated_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error en addToList:', error);
    return false;
  }
}

export async function removeLeadFromList(leadId: string, listaId: number): Promise<boolean> {
  try {
    const currentList = await fetchLeadListIds(leadId);

    await updateLead(leadId, {
      lista_ids: currentList.filter((id: number) => id !== listaId),
      updated_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error en removeFromList:', error);
    return false;
  }
}
