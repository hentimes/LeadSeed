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

/**
 * Cuantos envios de un canal hay desde un instante dado.
 *
 * `head: true` pide solo la cuenta: la fila entera no hace falta y el
 * historial de una cuenta activa son miles.
 *
 * Excluye los borrados. El panel no lo hace -su consulta es anterior al
 * borrado logico de `send_logs`- y por eso cuenta de mas.
 */
export async function countSendLogsSince(
  templateType: 'whatsapp' | 'email' | 'call',
  desdeIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('send_logs')
    .select('id', { count: 'exact', head: true })
    .eq('template_type', templateType)
    .gte('sent_at', desdeIso)
    .is('deleted_at', null);

  if (error) throw error;

  return count ?? 0;
}
