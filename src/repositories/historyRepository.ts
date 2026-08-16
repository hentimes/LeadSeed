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

export async function fetchSendLogRowsByTemplateId(templateId: number): Promise<SendLogRow[]> {
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
