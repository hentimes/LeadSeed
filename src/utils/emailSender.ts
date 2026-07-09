import emailjs from '@emailjs/browser';
import { getSettings } from '../db/database';
import type { Lead } from '../types';
import { replaceVariables } from './waHelper';

export async function sendEmail(
  lead: Lead,
  asunto: string,
  contenido: string,
  isHtml: boolean
): Promise<{ success: boolean; error?: string }> {
  const settings = await getSettings();

  if (!settings.emailJSUserId || !settings.emailJSServiceId || !settings.emailJSTemplateId) {
    return { success: false, error: 'Configura EmailJS en Settings primero' };
  }

  try {
    emailjs.init(settings.emailJSUserId);

    const subject = replaceVariables(asunto, lead);
    const body = replaceVariables(contenido, lead);

    const templateParams: Record<string, string> = {
      to_email: lead.email,
      to_name: lead.name,
      subject,
    };

    if (isHtml) {
      templateParams.message_html = body;
    } else {
      templateParams.message = body;
    }

    await emailjs.send(
      settings.emailJSServiceId,
      settings.emailJSTemplateId,
      templateParams
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

export async function sendEmailToLeads(
  leads: Lead[],
  asunto: string,
  contenido: string,
  isHtml: boolean
): Promise<{ total: number; sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const result = await sendEmail(lead, asunto, contenido, isHtml);
    if (result.success) {
      sent++;
    } else {
      errors.push(`${lead.name}: ${result.error}`);
    }
  }

  return { total: leads.length, sent, errors };
}
