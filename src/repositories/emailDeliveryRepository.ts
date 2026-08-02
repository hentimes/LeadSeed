import { supabase } from '../lib/supabaseClient';
import type { EmailAttachment, EmailProvider } from '../types';

/**
 * Invocacion de la edge function send-email.
 *
 * Vive en un repositorio, igual que las llamadas a email-channels: el cliente
 * de Supabase no se usa fuera de esta capa.
 */

export interface EmailDeliveryPayload {
  to: string;
  leadId?: string;
  leadName?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailChannelSelection {
  provider?: EmailProvider;
  channelId?: string;
}

export interface EmailBatchResult {
  ok: boolean;
  errors: string[];
  deliveries: Array<{ to: string; ok: boolean; error?: string }>;
}

export async function invokeSendEmailBatch(
  deliveries: EmailDeliveryPayload[],
  channelSelection?: EmailChannelSelection,
  fallbackProvider?: EmailProvider,
): Promise<EmailBatchResult> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      deliveries,
      requestedProvider: channelSelection?.provider || fallbackProvider,
      requestedChannelId: channelSelection?.channelId,
    },
  });

  if (error) {
    return {
      ok: false,
      errors: [error.message || 'No se pudo invocar send-email'],
      deliveries: [],
    };
  }

  return {
    ok: Boolean(data?.ok),
    errors: Array.isArray(data?.errors) ? data.errors.map(String) : [],
    deliveries: Array.isArray(data?.deliveries)
      ? data.deliveries.map((entry: Record<string, unknown>) => ({
          to: String(entry.to || ''),
          ok: Boolean(entry.ok),
          error: typeof entry.error === 'string' ? entry.error : undefined,
        }))
      : [],
  };
}
