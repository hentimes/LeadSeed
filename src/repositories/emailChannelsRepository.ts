import { supabase } from '../lib/supabaseClient';
import type { EmailChannelSummary } from '../types';
import { getErrorMessage } from '../utils/errorMessage';

type EmailChannelsResponse = {
  ok?: boolean;
  error?: string;
  channels?: EmailChannelSummary[];
  channel?: EmailChannelSummary;
};

export type CreateResendChannelInput = {
  channelName: string;
  fromName: string;
  fromEmail: string;
  apiKey: string;
  dailyLimit?: number;
  isDefault?: boolean;
};

export type UpdateEmailChannelInput = {
  id: string;
  channelName?: string;
  fromName?: string;
  fromEmail?: string;
  dailyLimit?: number;
  isActive?: boolean;
  isDefault?: boolean;
  apiKey?: string;
};

function ensureSuccess(data: EmailChannelsResponse | null, errorMessage?: string) {
  if (!data?.ok) {
    throw new Error(data?.error || errorMessage || 'No se pudo completar la operacion del canal');
  }
}

async function extractFunctionError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: { json?: () => Promise<unknown>; text?: () => Promise<string> } }).context
    if (context?.json) {
      try {
        const payload = await context.json() as { error?: string; message?: string }
        if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error
        if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
      } catch {
        // noop
      }
    }

    if (context?.text) {
      try {
        const text = await context.text()
        if (text?.trim()) return text
      } catch {
        // noop
      }
    }
  }

  return getErrorMessage(error, fallback)
}

export async function listEmailChannels(): Promise<EmailChannelSummary[]> {
  const { data, error } = await supabase.functions.invoke('email-channels', {
    method: 'GET',
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'No se pudieron cargar los canales'));
  }

  const payload = (data || null) as EmailChannelsResponse | null;
  ensureSuccess(payload, 'No se pudieron cargar los canales');
  return Array.isArray(payload?.channels) ? payload.channels : [];
}

export async function createResendChannel(input: CreateResendChannelInput): Promise<EmailChannelSummary> {
  const { data, error } = await supabase.functions.invoke('email-channels', {
    body: {
      provider: 'resend',
      channelName: input.channelName,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      isDefault: input.isDefault !== false,
      dailyLimit: input.dailyLimit,
      credentials: {
        apiKey: input.apiKey,
      },
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'No se pudo crear el canal Resend'));
  }

  const payload = (data || null) as EmailChannelsResponse | null;
  ensureSuccess(payload, 'No se pudo crear el canal Resend');

  if (!payload?.channel) {
    throw new Error('La API no devolvio el canal creado');
  }

  return payload.channel;
}

export async function updateEmailChannel(input: UpdateEmailChannelInput): Promise<EmailChannelSummary> {
  const body: Record<string, unknown> = {
    id: input.id,
  };

  if (typeof input.channelName === 'string') body.channelName = input.channelName;
  if (typeof input.fromName === 'string') body.fromName = input.fromName;
  if (typeof input.fromEmail === 'string') body.fromEmail = input.fromEmail;
  if (typeof input.dailyLimit === 'number') body.dailyLimit = input.dailyLimit;
  if (typeof input.isActive === 'boolean') body.isActive = input.isActive;
  if (typeof input.isDefault === 'boolean') body.isDefault = input.isDefault;
  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    body.credentials = {
      apiKey: input.apiKey,
    };
  }

  const { data, error } = await supabase.functions.invoke('email-channels', {
    method: 'PATCH',
    body,
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'No se pudo actualizar el canal'));
  }

  const payload = (data || null) as EmailChannelsResponse | null;
  ensureSuccess(payload, 'No se pudo actualizar el canal');

  if (!payload?.channel) {
    throw new Error('La API no devolvio el canal actualizado');
  }

  return payload.channel;
}

export async function deleteEmailChannel(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('email-channels', {
    method: 'DELETE',
    body: { id },
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'No se pudo eliminar el canal'));
  }

  ensureSuccess((data || null) as EmailChannelsResponse | null, 'No se pudo eliminar el canal');
}
