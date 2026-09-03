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
  // Los mapas guardan el lead, no su posicion. Antes guardaban el indice y
  // habia que volver a `active[indice]` para recuperarlo, con el rodeo de
  // afirmar dos veces que existia. El lead es lo que se necesita.
  const seenRut = new Map<string, Lead>();
  const seenPhone = new Map<string, Lead>();

  for (const lead of active) {
    const primeroConRut = lead.rut ? seenRut.get(lead.rut) : undefined;
    if (lead.rut && primeroConRut) {
      found.push({ lead1: primeroConRut, lead2: lead, reason: `RUT: ${lead.rut}` });
    } else if (lead.rut) {
      seenRut.set(lead.rut, lead);
    }

    const phone = lead.phone?.replace(/[^+\d]/g, '');
    const primeroConTelefono = phone ? seenPhone.get(phone) : undefined;
    if (phone && primeroConTelefono) {
      found.push({ lead1: primeroConTelefono, lead2: lead, reason: `Telefono: ${lead.phone}` });
    } else if (phone) {
      seenPhone.set(phone, lead);
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
