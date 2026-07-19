import { supabase } from '../lib/supabaseClient';
import type { Lead } from '../types';

export interface TaskRow {
  due_date: string | null;
}

export interface TaskAlertRow {
  title: string;
  due_date: string | null;
}

export interface ScheduledEmailLogRow {
  id: string;
  lead_id: string;
  template_id: string;
}

export interface ScheduledEmailTemplateRow {
  id: string;
  subject: string | null;
  content: string;
  is_html: boolean | null;
}

export interface ScheduledEmailLeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  rut: string;
  notes: string | null;
  status: string;
  lista_ids: number[] | null;
  score: number | null;
  metadata?: Lead['metadata'];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const SCHEDULED_EMAIL_LEAD_SELECT =
  'id, name, phone, email, company, rut, notes, status, lista_ids, score, metadata, created_at, updated_at, deleted_at';

export async function fetchPendingTaskRows(userId: string): Promise<TaskRow[]> {
  const { data } = await supabase
    .from('tasks')
    .select('due_date')
    .eq('status', 'pendiente')
    .eq('user_id', userId);

  return (data ?? []) as TaskRow[];
}

export async function fetchPendingTaskAlertRows(userId: string): Promise<TaskAlertRow[]> {
  const { data } = await supabase
    .from('tasks')
    .select('title, due_date')
    .eq('status', 'pendiente')
    .eq('user_id', userId);

  return (data ?? []) as TaskAlertRow[];
}

export async function purgeDeletedLeadsByUser(userId: string, cutoff: string): Promise<void> {
  await supabase.from('leads').delete().lt('deleted_at', cutoff).eq('user_id', userId);
}

export async function fetchDueScheduledEmailLogs(now: string): Promise<ScheduledEmailLogRow[]> {
  const { data } = await supabase
    .from('send_logs')
    .select('id, lead_id, template_id')
    .eq('template_type', 'email')
    .lte('scheduled_for', now);

  return (data ?? []) as ScheduledEmailLogRow[];
}

export async function fetchScheduledEmailTemplate(
  templateId: string
): Promise<ScheduledEmailTemplateRow | undefined> {
  const { data } = await supabase
    .from('templates')
    .select('id, subject, content, is_html')
    .eq('id', templateId)
    .single();

  return data ? (data as ScheduledEmailTemplateRow) : undefined;
}

export async function fetchScheduledEmailLeadRows(leadIds: string[]): Promise<ScheduledEmailLeadRow[]> {
  const { data } = await supabase
    .from('leads')
    .select(SCHEDULED_EMAIL_LEAD_SELECT)
    .in('id', leadIds);

  return (data ?? []) as ScheduledEmailLeadRow[];
}

export async function markScheduledEmailLogsAsSent(logIds: string[], sentAt: string): Promise<void> {
  await supabase.from('send_logs').update({ sent_at: sentAt, scheduled_for: null }).in('id', logIds);
}

export async function markLeadsAsContacted(leadIds: string[]): Promise<void> {
  await supabase.from('leads').update({ status: 'contactado' }).in('id', leadIds);
}
