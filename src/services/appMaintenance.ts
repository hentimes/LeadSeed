import {
  fetchDueScheduledEmailLogs,
  fetchPendingTaskRows,
  fetchScheduledEmailLeadRows,
  fetchScheduledEmailTemplate,
  markLeadsAsContacted,
  markScheduledEmailLogsAsSent,
  purgeDeletedLeadsByUser,
  type ScheduledEmailLogRow,
  type ScheduledEmailLeadRow,
} from '../repositories/appMaintenanceRepository';
import { sendEmailToLeads } from '../utils/emailSender';
import type { Lead, LeadStatus } from '../types';
// eslint-disable-next-line no-restricted-imports -- DEUDA BLOQUE 5: importa la implementacion de plataforma en vez de recibirla inyectada. Ver roadmap 13.6.
import { webStorage } from '../platform/web';

function mapLeadRowToDomain(row: ScheduledEmailLeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    rut: row.rut,
    notes: row.notes ?? '',
    status: row.status as LeadStatus,
    listaIds: row.lista_ids ?? [],
    score: row.score ?? 0,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export async function loadPendingTaskCount(userId: string): Promise<number> {
  const tasks = await fetchPendingTaskRows(userId);
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter(
    (task) => task.due_date && task.due_date.slice(0, 10) <= today
  ).length;
}

export async function purgeDeletedLeads(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  await purgeDeletedLeadsByUser(userId, cutoff);
}

export async function processScheduledEmails(): Promise<void> {
  const now = new Date().toISOString();
  const dueLogs = await fetchDueScheduledEmailLogs(now);
  if (dueLogs.length === 0) {
    void webStorage.local.set({ hasScheduledEmails: false });
    return;
  }

  const logsByTemplateId = new Map<string, ScheduledEmailLogRow[]>();
  for (const log of dueLogs) {
    const currentLogs = logsByTemplateId.get(log.template_id) ?? [];
    currentLogs.push(log);
    logsByTemplateId.set(log.template_id, currentLogs);
  }

  for (const [templateId, logs] of logsByTemplateId) {
    const template = await fetchScheduledEmailTemplate(templateId);
    if (!template) {
      continue;
    }

    const leadRows = await fetchScheduledEmailLeadRows(logs.map((log) => log.lead_id));
    if (leadRows.length === 0) {
      continue;
    }

    const validLeads = leadRows.map(mapLeadRowToDomain);

    await sendEmailToLeads(
      validLeads,
      template.subject ?? '',
      template.content,
      template.is_html ?? false
    );

    const sentAt = new Date().toISOString();
    await markScheduledEmailLogsAsSent(logs.map((log) => log.id), sentAt);
    await markLeadsAsContacted(leadRows.map((lead) => lead.id));
  }

  void webStorage.local.set({ hasScheduledEmails: false });
}
