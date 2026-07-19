import { supabase } from '../lib/supabaseClient';
import type { SendLogRow } from './historyRepository';

export async function fetchSendLogRowsByTemplate(templateId: number | string): Promise<SendLogRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('*')
    .eq('template_id', templateId)
    .order('sent_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as SendLogRow[];
}

export async function insertSendLogs(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('send_logs').insert(rows);
  if (error) {
    throw error;
  }
}

export async function markLeadRowsAsContacted(leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return;
  const { error } = await supabase.from('leads').update({ status: 'contactado' }).in('id', leadIds);
  if (error) {
    throw error;
  }
}
