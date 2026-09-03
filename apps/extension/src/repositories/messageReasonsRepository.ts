import { supabase } from '../lib/supabaseClient';

export interface MessageReasonRow {
  id: number;
  text: string;
  created_at: string;
}

const MESSAGE_REASONS_TABLE = 'message_reasons';

export async function fetchMessageReasonRows(userId: string): Promise<MessageReasonRow[]> {
  const { data, error } = await supabase
    .from(MESSAGE_REASONS_TABLE)
    .select('id, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as MessageReasonRow[];
}

export async function createMessageReason(payload: Record<string, unknown>): Promise<number> {
  const { data, error } = await supabase
    .from(MESSAGE_REASONS_TABLE)
    .insert(payload)
    .select('id')
    .single();

  if (error || !data) {
    throw error || new Error('No se pudo crear el motivo');
  }

  return data.id as number;
}

export async function updateMessageReason(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(MESSAGE_REASONS_TABLE).update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function deleteMessageReasonRow(id: number): Promise<void> {
  const { error } = await supabase.from(MESSAGE_REASONS_TABLE).delete().eq('id', id);
  if (error) {
    throw error;
  }
}
