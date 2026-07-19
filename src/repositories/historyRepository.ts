import { supabase } from '../lib/supabaseClient';

export interface SendLogRow {
  id: number;
  template_id: string;
  template_type: 'whatsapp' | 'email' | 'call';
  lead_id: string;
  lead_name: string | null;
  lead_phone: string | null;
  sent_at: string;
  scheduled_for: string | null;
}

export interface LeadNoteRow {
  id: number;
  lead_id: string;
  content: string;
  created_at: string;
}

export async function fetchRecentSendLogRows(limit = 100): Promise<SendLogRow[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
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
    return [];
  }

  return data as SendLogRow[];
}

export async function fetchSentLeadIdsByUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('send_logs')
    .select('lead_id')
    .eq('user_id', userId);

  if (error || !data) {
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
    return [];
  }

  return data as LeadNoteRow[];
}
