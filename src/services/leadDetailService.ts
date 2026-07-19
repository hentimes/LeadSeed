import {
  fetchLeadCrossExecEventRows,
  fetchLeadNotesByLeadId,
  fetchLeadSendLogsByLeadId,
  fetchTemplatesByType,
  insertLeadNote,
  markLeadCrossExecEventsAsRead,
} from '../repositories/leadDetailRepository';
import type { EmailTemplate, LeadCrossExecEvent, LeadNote, SendLog, WhatsAppTemplate } from '../types';

function mapLeadNote(row: Awaited<ReturnType<typeof fetchLeadNotesByLeadId>>[number]): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapSendLog(row: Awaited<ReturnType<typeof fetchLeadSendLogsByLeadId>>[number]): SendLog {
  return {
    id: row.id,
    templateId: row.template_id,
    templateType: row.template_type,
    leadId: row.lead_id,
    leadName: row.lead_name,
    leadPhone: row.lead_phone,
    sentAt: row.sent_at,
    scheduledFor: row.scheduled_for ?? undefined,
  };
}

function mapWhatsAppTemplate(row: Awaited<ReturnType<typeof fetchTemplatesByType>>[number]): WhatsAppTemplate {
  return {
    id: row.id,
    nombre: row.name,
    contenido: row.content,
    templateListIds: row.template_list_ids || [],
  } as WhatsAppTemplate;
}

function mapEmailTemplate(row: Awaited<ReturnType<typeof fetchTemplatesByType>>[number]): EmailTemplate {
  return {
    id: row.id,
    nombre: row.name,
    asunto: row.subject ?? '',
    contenido: row.content,
    isHtml: !!row.is_html,
    templateListIds: row.template_list_ids || [],
  } as EmailTemplate;
}

function mapCrossExecEvent(row: Awaited<ReturnType<typeof fetchLeadCrossExecEventRows>>[number]): LeadCrossExecEvent {
  return {
    id: row.id,
    leadId: row.lead_id,
    relatedLeadId: row.related_lead_id,
    eventKind: row.event_kind as LeadCrossExecEvent['eventKind'],
    counterpartCapturedAt: row.counterpart_captured_at,
    matchedBy: row.matched_by || [],
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

export async function loadLeadDetailData(leadId: string): Promise<{
  notes: LeadNote[];
  sendLogs: SendLog[];
  waTemplates: WhatsAppTemplate[];
  emailTemplates: EmailTemplate[];
}> {
  const [noteRows, logRows, waRows, emailRows] = await Promise.all([
    fetchLeadNotesByLeadId(leadId),
    fetchLeadSendLogsByLeadId(leadId),
    fetchTemplatesByType('whatsapp'),
    fetchTemplatesByType('email'),
  ]);

  return {
    notes: noteRows.map(mapLeadNote),
    sendLogs: logRows.map(mapSendLog),
    waTemplates: waRows.map(mapWhatsAppTemplate),
    emailTemplates: emailRows.map(mapEmailTemplate),
  };
}

export async function loadLeadCrossExecAlerts(leadId: string): Promise<LeadCrossExecEvent[]> {
  const rows = await fetchLeadCrossExecEventRows(leadId);
  return rows.map(mapCrossExecEvent);
}

export async function markLeadCrossExecAlertsAsRead(eventIds: string[]): Promise<void> {
  await markLeadCrossExecEventsAsRead(eventIds, new Date().toISOString());
}

export async function createLeadNote(leadId: string, userId: string, content: string): Promise<LeadNote[]> {
  await insertLeadNote(leadId, userId, content.trim());
  const updatedRows = await fetchLeadNotesByLeadId(leadId);
  return updatedRows.map(mapLeadNote);
}
