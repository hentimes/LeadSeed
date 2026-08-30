import { supabase } from '../lib/supabaseClient';
import type { Lead } from '../types';

export interface DuplicateLeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  rut: string | null;
  notes: string | null;
  status: string | null;
  lista_ids: number[] | null;
  score: number | null;
  metadata: Lead['metadata'];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const DUPLICATE_LEAD_SELECT =
  'id, name, phone, email, company, rut, notes, status, lista_ids, score, metadata, created_at, updated_at, deleted_at';

export async function fetchActiveDuplicateLeadRows(userId: string): Promise<DuplicateLeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(DUPLICATE_LEAD_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error || !data) {
    return [];
  }

  return data as DuplicateLeadRow[];
}

export async function updatePrimaryDuplicateLead(
  leadId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('leads').update(payload).eq('id', leadId);
  if (error) {
    throw error;
  }
}

export async function moveLeadNotes(fromLeadId: string, toLeadId: string): Promise<void> {
  const { error } = await supabase.from('lead_notes').update({ lead_id: toLeadId }).eq('lead_id', fromLeadId);
  if (error) {
    throw error;
  }
}

export async function moveSendLogs(fromLeadId: string, toLeadId: string): Promise<void> {
  const { error } = await supabase.from('send_logs').update({ lead_id: toLeadId }).eq('lead_id', fromLeadId);
  if (error) {
    throw error;
  }
}

export async function removeDuplicateLead(leadId: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  if (error) {
    throw error;
  }
}
