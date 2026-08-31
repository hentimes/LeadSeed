import {
  fetchSendLogCountRowsByUser,
  fetchSentLeadIdsByUser,
  fetchRecentLeadNoteRows,
  fetchRecentSendLogRows,
  fetchSendLogRowsByUser,
  fetchSendLogRowsByTemplateId,
  setSendLogDeletedAt,
  type LeadNoteRow,
  type SendLogCountRow,
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
    templateName: row.template_name || undefined,
    content: row.content || undefined,
    subject: row.subject || undefined,
    isHtml: row.is_html ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

/**
 * Marca una fila del historial como eliminada, o la restaura con `null`.
 *
 * ## Lo eliminado SIGUE contando
 *
 * Y conviene dejarlo escrito, porque la tentacion de "arreglarlo" despues es
 * real: `buildLeadSendCounts` y `fetchSentLeadIdsSetForUser` **no** filtran por
 * `deletedAt`, a proposito.
 *
 * Eliminar una linea del historial es ordenar una lista, no negar un hecho. Si
 * los contadores restaran, limpiar el historial le bajaria los numeros al panel
 * y devolveria leads a la bandeja de olvidados como si nunca se les hubiera
 * escrito. Eso es peor que la lista larga que se queria ordenar.
 */
export async function softDeleteSendLog(logId: number, eliminado: boolean): Promise<void> {
  await setSendLogDeletedAt(logId, eliminado ? new Date().toISOString() : null);
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

export async function fetchLeadSendCountsForUser(
  userId: string
): Promise<Record<string, { whatsapp: number; email: number }>> {
  const rows = await fetchSendLogCountRowsByUser(userId);
  return buildLeadSendCounts(rows);
}

export async function fetchSendLogsForTemplate(templateId: string | number): Promise<SendLog[]> {
  const rows = await fetchSendLogRowsByTemplateId(templateId);
  return rows.map(mapSendLogRowToDomain);
}

export async function fetchSentLeadIdsSetForUser(userId: string): Promise<Set<string>> {
  const leadIds = await fetchSentLeadIdsByUser(userId);
  return new Set(leadIds);
}

export function buildLeadSendCounts(
  logs: Array<Pick<SendLog, 'leadId' | 'templateType'> | SendLogCountRow>
): Record<string, { whatsapp: number; email: number }> {
  const counts: Record<string, { whatsapp: number; email: number }> = {};

  for (const log of logs) {
    const leadId = 'leadId' in log ? log.leadId : log.lead_id;
    if (!leadId) {
      continue;
    }

    if (!counts[leadId]) {
      counts[leadId] = { whatsapp: 0, email: 0 };
    }

    const templateType = 'templateType' in log ? log.templateType : log.template_type;
    if (templateType === 'whatsapp') {
      counts[leadId].whatsapp += 1;
    } else if (templateType === 'email') {
      counts[leadId].email += 1;
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

  /**
   * Nombre de lo que se envio, en orden de fiabilidad.
   *
   * 1. La copia guardada al enviar (migracion 106). Es la unica que no miente
   *    si la plantilla se edito o se borro despues.
   * 2. La plantilla viva, para los envios anteriores a esa migracion.
   * 3. Un texto que reconoce lo que no se sabe.
   *
   * Sin `templateId` no hay plantilla que buscar: es el chat abierto a mano
   * desde la ficha del lead. Llamarlo "plantilla eliminada" seria inventar una
   * que nunca existio.
   */
  const nombreDe = (log: SendLog, viva?: { nombre: string }) => {
    if (log.templateName) return log.templateName;
    if (log.templateId == null) return 'Mensaje directo';
    return viva?.nombre || '(plantilla eliminada)';
  };

  return logs.map((log) => {
    if (log.templateType === 'whatsapp') {
      const template = log.templateId == null ? undefined : waMap.get(log.templateId);
      return {
        ...log,
        templateNombre: nombreDe(log, template),
        templateContenido: log.content || template?.contenido || '',
        isHtml: false,
      };
    }

    const template = log.templateId == null ? undefined : emailMap.get(log.templateId);
    return {
      ...log,
      templateNombre: nombreDe(log, template),
      templateContenido: log.content || template?.contenido || '',
      isHtml: log.isHtml ?? template?.isHtml ?? false,
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
