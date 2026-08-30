import { supabase } from '../lib/supabaseClient';

export interface LeadNoteRow {
  id: number;
  lead_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
}

export interface LeadSendLogRow {
  id: number;
  template_id: number | string;
  template_type: 'whatsapp' | 'email' | 'call';
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  sent_at: string;
  scheduled_for: string | null;
}

export interface TemplateRow {
  id: number;
  name: string;
  content: string;
  subject: string | null;
  is_html: boolean | null;
  type: 'whatsapp' | 'email';
  template_list_ids: number[] | null;
}

export interface LeadCrossExecEventRow {
  id: string;
  lead_id: string;
  related_lead_id: string;
  event_kind: string;
  counterpart_captured_at: string;
  matched_by: string[] | null;
  is_read: boolean | null;
  created_at: string;
}

export async function fetchLeadNotesByLeadId(leadId: string): Promise<LeadNoteRow[]> {
  const { data } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return (data ?? []) as LeadNoteRow[];
}

export async function fetchLeadSendLogsByLeadId(leadId: string): Promise<LeadSendLogRow[]> {
  const { data } = await supabase
    .from('send_logs')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false });

  return (data ?? []) as LeadSendLogRow[];
}

export async function fetchTemplatesByType(type: 'whatsapp' | 'email'): Promise<TemplateRow[]> {
  const { data } = await supabase.from('templates').select('*').eq('type', type);
  return (data ?? []) as TemplateRow[];
}

export async function fetchLeadCrossExecEventRows(leadId: string): Promise<LeadCrossExecEventRow[]> {
  const { data } = await supabase
    .from('lead_cross_exec_events')
    .select('id, lead_id, related_lead_id, event_kind, counterpart_captured_at, matched_by, is_read, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return (data ?? []) as LeadCrossExecEventRow[];
}

export async function markLeadCrossExecEventsAsRead(eventIds: string[], readAt: string): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }

  await supabase.from('lead_cross_exec_events').update({ is_read: true, read_at: readAt }).in('id', eventIds);
}

export async function insertLeadNote(leadId: string, userId: string, content: string): Promise<void> {
  await supabase.from('lead_notes').insert({
    lead_id: leadId,
    user_id: userId,
    content,
  });
}
