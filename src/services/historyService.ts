import {
  fetchSentLeadIdsByUser,
  fetchRecentLeadNoteRows,
  fetchRecentSendLogRows,
  fetchSendLogRowsByUser,
  fetchSendLogRowsByTemplateId,
  type LeadNoteRow,
  type SendLogRow,
} from '../repositories/historyRepository';
import type { EmailTemplate, Lead, LeadNote, SendLog, WhatsAppTemplate } from '../types';

export type EnrichedLog = SendLog & {
  templateNombre: string;
  templateContenido: string;
  isHtml: boolean;
};

export type ActivityItem = {
  type: 'send' | 'note';
  text: string;
  time: string;
  leadName?: string;
};

function mapSendLogRowToDomain(row: SendLogRow): SendLog {
  return {
    id: row.id,
    templateId: row.template_id,
    templateType: row.template_type,
    leadId: row.lead_id,
    leadName: row.lead_name || '',
    leadPhone: row.lead_phone || '',
    sentAt: row.sent_at,
    scheduledFor: row.scheduled_for || undefined,
  };
}

function mapLeadNoteRowToDomain(row: LeadNoteRow): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    createdAt: row.created_at,
    content: row.content,
  };
}

export async function fetchRecentHistoryData(): Promise<{ logs: SendLog[]; notes: LeadNote[] }> {
  const [sendLogRows, leadNoteRows] = await Promise.all([
    fetchRecentSendLogRows(),
    fetchRecentLeadNoteRows(),
  ]);

  return {
    logs: sendLogRows.map(mapSendLogRowToDomain),
    notes: leadNoteRows.map(mapLeadNoteRowToDomain),
  };
}

export async function fetchRecentSendLogsForUser(userId: string): Promise<SendLog[]> {
  const rows = await fetchSendLogRowsByUser(userId);
  return rows.map(mapSendLogRowToDomain);
}

export async function fetchSendLogsForTemplate(templateId: number): Promise<SendLog[]> {
  const rows = await fetchSendLogRowsByTemplateId(templateId);
  return rows.map(mapSendLogRowToDomain);
}

export async function fetchSentLeadIdsSetForUser(userId: string): Promise<Set<string>> {
  const leadIds = await fetchSentLeadIdsByUser(userId);
  return new Set(leadIds);
}

export function buildLeadSendCounts(
  logs: SendLog[]
): Record<string, { whatsapp: number; email: number }> {
  const counts: Record<string, { whatsapp: number; email: number }> = {};

  for (const log of logs) {
    if (!counts[log.leadId]) {
      counts[log.leadId] = { whatsapp: 0, email: 0 };
    }

    if (log.templateType === 'whatsapp') {
      counts[log.leadId].whatsapp += 1;
    } else if (log.templateType === 'email') {
      counts[log.leadId].email += 1;
    }
  }

  return counts;
}

export function enrichSendLogs(
  logs: SendLog[],
  waTemplates: WhatsAppTemplate[],
  emailTemplates: EmailTemplate[]
): EnrichedLog[] {
  const waMap = new Map<string | number, WhatsAppTemplate>();
  for (const template of waTemplates) {
    if (template.id != null) {
      waMap.set(template.id, template);
    }
  }

  const emailMap = new Map<string | number, EmailTemplate>();
  for (const template of emailTemplates) {
    if (template.id != null) {
      emailMap.set(template.id, template);
    }
  }

  return logs.map((log) => {
    if (log.templateType === 'whatsapp') {
      const template = waMap.get(log.templateId);
      return {
        ...log,
        templateNombre: template?.nombre || '(plantilla eliminada)',
        templateContenido: template?.contenido || '',
        isHtml: false,
      };
    }

    const template = emailMap.get(log.templateId);
    return {
      ...log,
      templateNombre: template?.nombre || '(plantilla eliminada)',
      templateContenido: template?.contenido || '',
      isHtml: template?.isHtml || false,
    };
  });
}

export function buildActivityFeed(logs: SendLog[], notes: LeadNote[], leads: Lead[]): ActivityItem[] {
  const activity: ActivityItem[] = [];

  for (const log of logs.slice(0, 50)) {
    activity.push({
      type: 'send',
      text: `Mensaje enviado a ${log.leadName}`,
      time: log.sentAt,
      leadName: log.leadName,
    });
  }

  for (const note of notes.slice(0, 50)) {
    const lead = leads.find((item) => item.id === note.leadId);
    activity.push({
      type: 'note',
      text: `Nota${lead ? ` en ${lead.name}` : ''}`,
      time: note.createdAt,
      leadName: lead?.name,
    });
  }

  activity.sort((left, right) => right.time.localeCompare(left.time));
  return activity;
}
