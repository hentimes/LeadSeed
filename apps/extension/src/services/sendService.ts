import type { Lead, SendLog } from '../types';
import {
  countSendLogsSince,
  fetchSendLogRowsByTemplate,
  insertSendLogs,
  markLeadRowsAsContacted,
} from '../repositories/sendRepository';
import type { EmailAttachment } from '../types';
import { sendEmailToLeads } from '../utils/emailSender';
import { replaceVariables, type LeadMessage } from '../utils/waHelper';

function mapSendLogRow(row: Awaited<ReturnType<typeof fetchSendLogRowsByTemplate>>[number]): SendLog {
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
  };
}

export async function loadTemplateSendLog(templateId: number | string): Promise<SendLog[]> {
  return (await fetchSendLogRowsByTemplate(templateId)).map(mapSendLogRow);
}

/**
 * Cuantos mensajes se enviaron hoy por un canal.
 *
 * El dia se corta en la hora de quien envia, no en UTC: `setHours(0,0,0,0)`
 * sobre la fecha local. La consulta del panel usa `date_trunc('day', now())`
 * en el servidor, que en Supabase corre en UTC, asi que alli el dia cambia a
 * las 20:00 o 21:00 de Chile. Aca no.
 */
export async function countSendsToday(
  canal: 'whatsapp' | 'email' | 'call',
): Promise<number> {
  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);

  return countSendLogsSince(canal, inicioDelDia.toISOString());
}

/**
 * Registra que se abrio WhatsApp para estos destinatarios.
 *
 * Recibe los mensajes **ya resueltos** en vez de los leads y la plantilla, para
 * guardar exactamente el texto que se abrio. Resolverlo aqui otra vez seria
 * arriesgarse a que el historial y lo enviado se separen.
 *
 * Ojo con el nombre: esto no confirma ningun envio. WhatsApp se abre en otra
 * pestaña y la aplicacion no sabe si el mensaje llego a salir.
 */
export async function logWhatsAppSend(
  userId: string,
  templateId: number | string,
  mensajes: LeadMessage[],
  templateName: string
): Promise<SendLog[]> {
  const now = new Date().toISOString();
  await insertSendLogs(
    mensajes.map(({ lead, message }) => ({
      user_id: userId,
      template_id: templateId,
      template_type: 'whatsapp',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone,
      sent_at: now,
      template_name: templateName,
      content: message,
    }))
  );
  await markLeadRowsAsContacted(mensajes.map(({ lead }) => lead.id!).filter(Boolean));
  return loadTemplateSendLog(templateId);
}

/**
 * Registra que se abrio el chat de WhatsApp de un lead sin usar plantilla.
 *
 * Existe porque el boton de WhatsApp de la ficha del lead abria el chat y **no
 * dejaba rastro**: ese envio no aparecia en el historial, no sumaba en el
 * contador de la lista y no habria contado para los flujos. Todo lo escrito
 * desde ahi era invisible para el sistema.
 *
 * Se guarda sin plantilla y sin contenido, que es la verdad: no hubo plantilla y
 * el mensaje lo escribio la persona dentro de WhatsApp, donde no llegamos.
 */
export async function logDirectWhatsAppOpen(userId: string, lead: Lead): Promise<void> {
  await insertSendLogs([
    {
      user_id: userId,
      template_id: null,
      template_type: 'whatsapp',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone,
      sent_at: new Date().toISOString(),
    },
  ]);
  // Mismo criterio que un envio con plantilla: abrir el chat cuenta como
  // gestionar al lead.
  await markLeadRowsAsContacted([lead.id!].filter(Boolean));
}

export async function scheduleEmailSend(
  userId: string,
  templateId: number | string,
  recipients: Lead[],
  scheduledFor: string,
  plantilla?: { nombre: string; asunto: string; contenido: string; isHtml: boolean }
): Promise<SendLog[]> {
  const now = new Date().toISOString();
  await insertSendLogs(
    recipients.map((lead) => ({
      user_id: userId,
      template_id: templateId,
      template_type: 'email',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone || lead.email,
      sent_at: now,
      scheduled_for: scheduledFor,
      // La plantilla es opcional para no romper a quien llame sin ella; sin
      // ella el historial cae a la plantilla viva, como antes.
      template_name: plantilla?.nombre ?? null,
      subject: plantilla ? replaceVariables(plantilla.asunto, lead) : null,
      content: plantilla ? replaceVariables(plantilla.contenido, lead) : null,
      is_html: plantilla?.isHtml ?? null,
    }))
  );
  return loadTemplateSendLog(templateId);
}

export async function sendImmediateEmail(
  userId: string,
  templateId: number | string,
  recipients: Lead[],
  subject: string,
  body: string,
  isHtml: boolean,
  attachments: EmailAttachment[],
  channelSelection?: { provider?: 'gmail' | 'resend' | 'emailjs'; channelId?: string },
  templateName?: string
) {
  const result = await sendEmailToLeads(recipients, subject, body, isHtml, attachments, channelSelection);
  const now = new Date().toISOString();

  await insertSendLogs(
    recipients.map((lead) => ({
      user_id: userId,
      template_id: templateId,
      template_type: 'email',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone || lead.email,
      sent_at: now,
      template_name: templateName ?? null,
      // Se resuelve igual que en `emailSender`, que es quien acaba de enviarlo.
      subject: replaceVariables(subject, lead),
      content: replaceVariables(body, lead),
      is_html: isHtml,
    }))
  );

  await markLeadRowsAsContacted(recipients.map((lead) => lead.id!).filter(Boolean));

  return {
    result,
    sentLog: await loadTemplateSendLog(templateId),
  };
}

export async function logCallSend(
  userId: string,
  templateId: number | string,
  lead: Lead,
  plantilla?: { nombre: string; contenido: string }
): Promise<void> {
  await insertSendLogs([
    {
      user_id: userId,
      template_id: templateId,
      template_type: 'call',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone,
      sent_at: new Date().toISOString(),
      template_name: plantilla?.nombre ?? null,
      // El guion con el que se llamo, resuelto para esta persona.
      content: plantilla ? replaceVariables(plantilla.contenido, lead) : null,
    },
  ]);
  await markLeadRowsAsContacted([lead.id!]);
}
