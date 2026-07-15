import emailjs from '@emailjs/browser';
import { getSettings } from '../db/database';
import type { Lead } from '../types';
import { replaceVariables } from './waHelper';

export interface EmailAttachment {
  filename: string;
  content: string;
}

async function sendEmail(
  lead: Lead,
  asunto: string,
  contenido: string,
  isHtml: boolean,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; error?: string }> {
  const settings = await getSettings();
  const provider = settings.emailProvider || 'emailjs';

  const subject = replaceVariables(asunto, lead);
  // Limpiar backticks de markdown (```) que los usuarios a menudo copian por error desde IAs y que rompen el CSS en Gmail
  let body = replaceVariables(contenido, lead);
  body = body.replace(/```[a-z]*\n/gi, '').replace(/```/g, '');

  if (provider === 'resend') {
    if (!settings.resendApiKey) {
      return { success: false, error: 'Configura la API Key de Resend en Ajustes' };
    }

    try {
      // Nota: Para producción en Resend necesitas un dominio verificado (ej: hola@tudominio.com).
      // Por defecto Resend usa onboarding@resend.dev para pruebas (solo puedes enviarte a ti mismo).
      const fromName = settings.resendFromName || 'Acme';
      const fromEmail = settings.resendFromEmail || 'onboarding@resend.dev';

      const payload: any = {
        from: `${fromName} <${fromEmail}>`,
        to: [lead.email],
        subject: subject,
      };

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      if (isHtml) {
        const hasTags = /<[a-z][\s\S]*>/i.test(body);
        const formattedHtml = hasTags ? body : body.replace(/\n/g, '<br/>');
        
        // Fallback de texto puro: remover bloques <style> y <script> enteros, luego tags, y limpiar espacios
        const textFallback = body
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>?/gm, '')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();
        
        payload.html = formattedHtml;
        payload.text = textFallback;
      } else {
        payload.text = body;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.message || 'Error al enviar por Resend' };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido en Resend';
      return { success: false, error: msg };
    }
  }

  // --- Fallback a EmailJS (Original) ---
  if (!settings.emailJSUserId || !settings.emailJSServiceId || !settings.emailJSTemplateId) {
    return { success: false, error: 'Configura EmailJS en Ajustes primero' };
  }

  try {
    emailjs.init(settings.emailJSUserId);
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

    await emailjs.send(settings.emailJSServiceId, settings.emailJSTemplateId, templateParams);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido en EmailJS';
    return { success: false, error: msg };
  }
}

export async function sendEmailToLeads(
  leads: Lead[],
  asunto: string,
  contenido: string,
  isHtml: boolean,
  attachments: EmailAttachment[] = []
): Promise<{ total: number; sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const result = await sendEmail(lead, asunto, contenido, isHtml, attachments);
    if (result.success) {
      sent++;
    } else {
      errors.push(`${lead.name}: ${result.error}`);
    }
  }

  return { total: leads.length, sent, errors };
}
