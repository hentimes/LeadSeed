import type { Lead, SendLog } from '../types';
import { fetchSendLogRowsByTemplate, insertSendLogs, markLeadRowsAsContacted } from '../repositories/sendRepository';
import type { EmailAttachment } from '../types';
import { sendEmailToLeads } from '../utils/emailSender';

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
  };
}

export async function loadTemplateSendLog(templateId: number | string): Promise<SendLog[]> {
  return (await fetchSendLogRowsByTemplate(templateId)).map(mapSendLogRow);
}

export async function logWhatsAppSend(
  userId: string,
  templateId: number | string,
  recipients: Lead[]
): Promise<SendLog[]> {
  const now = new Date().toISOString();
  await insertSendLogs(
    recipients.map((lead) => ({
      user_id: userId,
      template_id: templateId,
      template_type: 'whatsapp',
      lead_id: lead.id!,
      lead_name: lead.name,
      lead_phone: lead.phone,
      sent_at: now,
    }))
  );
  await markLeadRowsAsContacted(recipients.map((lead) => lead.id!).filter(Boolean));
  return loadTemplateSendLog(templateId);
}

export async function scheduleEmailSend(
  userId: string,
  templateId: number | string,
  recipients: Lead[],
  scheduledFor: string
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
  channelSelection?: { provider?: 'gmail' | 'resend' | 'emailjs'; channelId?: string }
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
  lead: Lead
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
    },
  ]);
  await markLeadRowsAsContacted([lead.id!]);
}
