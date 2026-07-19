import {
  fetchActiveDuplicateLeadRows,
  moveLeadNotes,
  moveSendLogs,
  removeDuplicateLead,
  updatePrimaryDuplicateLead,
  type DuplicateLeadRow,
} from '../repositories/duplicatesRepository';
import type { Lead, LeadStatus } from '../types';

export interface DuplicatePair {
  lead1: Lead;
  lead2: Lead;
  reason: string;
}

function mapDuplicateLeadRow(row: DuplicateLeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    company: row.company || '',
    rut: row.rut || '',
    notes: row.notes || '',
    status: (row.status || 'nuevo') as LeadStatus,
    listaIds: row.lista_ids || [],
    score: row.score || 0,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export async function findUserDuplicatePairs(userId: string): Promise<DuplicatePair[]> {
  const active = (await fetchActiveDuplicateLeadRows(userId)).map(mapDuplicateLeadRow);
  const found: DuplicatePair[] = [];
  const seenRut = new Map<string, number>();
  const seenPhone = new Map<string, number>();

  for (let index = 0; index < active.length; index += 1) {
    const lead = active[index];

    if (lead.rut && seenRut.has(lead.rut)) {
      found.push({ lead1: active[seenRut.get(lead.rut)!], lead2: lead, reason: `RUT: ${lead.rut}` });
    } else if (lead.rut) {
      seenRut.set(lead.rut, index);
    }

    const phone = lead.phone?.replace(/[^+\d]/g, '');
    if (phone && seenPhone.has(phone)) {
      found.push({ lead1: active[seenPhone.get(phone)!], lead2: lead, reason: `Telefono: ${lead.phone}` });
    } else if (phone) {
      seenPhone.set(phone, index);
    }
  }

  return found;
}

export async function mergeDuplicateLeadPair(lead1: Lead, lead2: Lead): Promise<void> {
  const mergedLists = [...new Set([...(lead1.listaIds || []), ...(lead2.listaIds || [])])];
  const mergedNotes = [lead1.notes, lead2.notes].filter(Boolean).join(' | ');

  await updatePrimaryDuplicateLead(lead1.id!, {
    name: lead1.name || lead2.name,
    phone: lead1.phone || lead2.phone,
    email: lead1.email || lead2.email,
    company: lead1.company || lead2.company,
    rut: lead1.rut || lead2.rut,
    notes: mergedNotes,
    status: (lead1.status !== 'nuevo' ? lead1.status : lead2.status) || 'nuevo',
    lista_ids: mergedLists,
    updated_at: new Date().toISOString(),
  });

  await moveLeadNotes(lead2.id!, lead1.id!);
  await moveSendLogs(lead2.id!, lead1.id!);
  await removeDuplicateLead(lead2.id!);
}
