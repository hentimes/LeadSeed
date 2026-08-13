import emailjs from '@emailjs/browser';
import { getSettings } from '../services/appSettingsService';
import { invokeSendEmailBatch } from '../repositories/emailDeliveryRepository';
import type { EmailAttachment, EmailProvider, Lead } from '../types';
import { replaceVariables } from './waHelper';
import { getErrorMessage } from './errorMessage';


type DeliveryPayload = {
  to: string;
  leadId?: string;
  leadName?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
};

type ChannelSelection = {
  provider?: EmailProvider;
  channelId?: string;
};

function stripMarkdownFences(value: string) {
  return value.replace(/```[a-z]*\n/gi, '').replace(/```/g, '');
}

function buildTextFallback(body: string) {
  return body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

async function sendBackendBatch(
  deliveries: DeliveryPayload[],
  channelSelection?: ChannelSelection,
  fallbackProvider?: EmailProvider,
) {
  return invokeSendEmailBatch(deliveries, channelSelection, fallbackProvider);
}

async function sendEmailJsEmail(
  lead: Lead,
  subject: string,
  body: string,
  isHtml: boolean,
): Promise<{ success: boolean; error?: string }> {
  const settings = await getSettings();

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
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, 'Error desconocido en EmailJS'),
    };
  }
}

export async function sendEmailToLeads(
  leads: Lead[],
  asunto: string,
  contenido: string,
  isHtml: boolean,
  attachments: EmailAttachment[] = [],
  channelSelection?: ChannelSelection
): Promise<{ total: number; sent: number; errors: string[] }> {
  const settings = await getSettings();
  const provider = settings.emailProvider || 'resend';
  const errors: string[] = [];

  const preparedLeads = leads
    .filter((lead) => String(lead.email || '').trim())
    .map((lead) => {
      const subject = replaceVariables(asunto, lead);
      const rawBody = stripMarkdownFences(replaceVariables(contenido, lead));
      const hasTags = /<[a-z][\s\S]*>/i.test(rawBody);
      const htmlBody = isHtml ? (hasTags ? rawBody : rawBody.replace(/\n/g, '<br/>')) : undefined;
      const textBody = isHtml ? buildTextFallback(rawBody) : rawBody;
      return {
        lead,
        delivery: {
          to: lead.email,
          leadId: lead.id,
          leadName: lead.name,
          subject,
          html: htmlBody,
          text: textBody,
          attachments,
        } satisfies DeliveryPayload,
      };
    });

  if (provider === 'resend' || provider === 'gmail' || channelSelection?.provider === 'resend' || channelSelection?.provider === 'gmail') {
    const result = await sendBackendBatch(preparedLeads.map((entry) => entry.delivery), channelSelection, provider);
    const failedByRecipient = new Map<string, string>();
    let successfulDeliveries = 0;

    for (const delivery of result.deliveries) {
      if (delivery.ok) {
        successfulDeliveries += 1;
      } else {
        failedByRecipient.set(delivery.to, delivery.error || 'Error al enviar por Resend');
      }
    }

    for (const entry of preparedLeads) {
      const failure = failedByRecipient.get(entry.delivery.to);
      if (failure) {
        errors.push(`${entry.lead.name}: ${failure}`);
      }
    }

    for (const upstreamError of result.errors) {
      if (!errors.includes(upstreamError)) {
        errors.push(upstreamError);
      }
    }

    return {
      total: preparedLeads.length,
      sent: successfulDeliveries,
      errors,
    };
  }

  let sent = 0;
  for (const entry of preparedLeads) {
    const response = await sendEmailJsEmail(
      entry.lead,
      entry.delivery.subject,
      isHtml ? entry.delivery.html || '' : entry.delivery.text || '',
      isHtml,
    );

    if (response.success) {
      sent += 1;
      continue;
    }

    errors.push(`${entry.lead.name}: ${response.error}`);
  }

  return { total: preparedLeads.length, sent, errors };
}
