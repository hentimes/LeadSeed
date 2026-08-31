import { supabase } from '../lib/supabaseClient';

export interface SendLogRow {
  id: number;
  /** Nulo cuando se abrio el chat sin plantilla desde la ficha del lead. */
  template_id: string | null;
  template_type: 'whatsapp' | 'email' | 'call';
  lead_id: string;
  lead_name: string | null;
  lead_phone: string | null;
  sent_at: string;
  scheduled_for: string | null;
  /**
   * Copia de lo que se envio, escrita en el momento del envio (migracion 106).
   * Nula en los registros anteriores; entonces el historial cae a la plantilla
   * viva, que es como funcionaba antes.
   */
  template_name: string | null;
  content: string | null;
  subject: string | null;
  is_html: boolean | null;
  /**
   * Marca de borrado blando (migracion 135). Con valor, el historial pinta la
   * fila como lapida y no muestra el contenido; el envio sigue contando para
   * los contadores del lead y las metricas del panel, porque ocurrio.
   */
  deleted_at: string | null;
}

export interface LeadNoteRow {
  id: number;
  lead_id: string;
  content: string;
  created_at: string;
}

export interface SendLogCountRow {
  lead_id: string;
  template_type: 'whatsapp' | 'email' | 'call';
}

export async function fetchRecentSendLogRows(limit = 100): Promise<SendLogRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) {
      console.error('fetchRecentSendLogRows failed', error);
    }
    return [];
  }

  return data as SendLogRow[];
}

export async function fetchSendLogRowsByUser(userId: string): Promise<SendLogRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) {
    if (error) {
      console.error('fetchSendLogRowsByUser failed', error);
    }
    return [];
  }

  return data as SendLogRow[];
}

export async function fetchSendLogCountRowsByUser(userId: string): Promise<SendLogCountRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('lead_id, template_type')
    .eq('user_id', userId)
    .in('template_type', ['whatsapp', 'email']);

  if (error || !data) {
    if (error) {
      console.error('fetchSendLogCountRowsByUser failed', error);
    }
    return [];
  }

  return data as SendLogCountRow[];
}

export async function fetchSentLeadIdsByUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('lead_id')
    .eq('user_id', userId);

  if (error || !data) {
    if (error) {
      console.error('fetchSentLeadIdsByUser failed', error);
    }
    return [];
  }

  return data
    .map((row) => row.lead_id)
    .filter((leadId): leadId is string => typeof leadId === 'string' && leadId.length > 0);
}

/** `template_id` es uuid: recibir solo `number` obligaba a convertirlo y perderlo. */
export async function fetchSendLogRowsByTemplateId(templateId: string | number): Promise<SendLogRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('*')
    .eq('template_id', templateId)
    .order('sent_at', { ascending: false });

  if (error || !data) {
    if (error) {
      console.error('fetchSendLogRowsByTemplateId failed', error);
    }
    return [];
  }

  return data as SendLogRow[];
}

/**
 * Marca o desmarca una fila del historial como eliminada.
 *
 * No borra: escribe `deleted_at`. Ver la cabecera de la migracion 135 para el
 * porque -en resumen, `send_logs` alimenta los contadores del lead, la bandeja
 * de olvidados y el panel, y un DELETE les bajaria los numeros en silencio-.
 *
 * No lleva `.eq('user_id', ...)`: la politica RLS es `FOR ALL` sobre
 * `auth.uid() = user_id`, asi que un intento sobre una fila ajena no actualiza
 * nada. Agregarlo aca daria la falsa impresion de que la seguridad la pone el
 * cliente.
 */
export async function setSendLogDeletedAt(logId: number, deletedAt: string | null): Promise<void> {
  const { error } = await supabase
    .from('send_logs')
    .update({ deleted_at: deletedAt })
    .eq('id', logId);

  if (error) throw error;
}

export async function fetchRecentLeadNoteRows(limit = 100): Promise<LeadNoteRow[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) {
      console.error('fetchRecentLeadNoteRows failed', error);
    }
    return [];
  }

  return data as LeadNoteRow[];
}
