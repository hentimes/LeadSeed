import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'

export type EmailChannelRow = {
  id: string
  user_id: string
  provider: string
  channel_name: string
  from_name: string | null
  from_email: string | null
  is_active: boolean
  is_default: boolean
  daily_limit: number | null
  credentials_ciphertext: string
  credentials_hint: string | null
  metadata: Record<string, unknown> | null
  last_tested_at: string | null
  last_test_status: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type EmailChannelListRow = Omit<EmailChannelRow, 'credentials_ciphertext'>

export type EmailChannelCredentials =
  | {
      provider: 'resend'
      apiKey: string
    }
  | {
      provider: 'emailjs'
      publicKey: string
      serviceId: string
      templateId: string
    }

export type ResolvedEmailChannel = {
  source: 'user_channel' | 'system_fallback'
  provider: string
  channelId: string
  channelName: string
  fromName: string
  fromEmail: string
  dailyLimit: number
  credentials: EmailChannelCredentials
}

const EMAIL_CHANNELS_MASTER_KEY = Deno.env.get('EMAIL_CHANNELS_MASTER_KEY') || ''

export const DEFAULT_FROM_EMAIL = Deno.env.get('APPOINTMENT_NOTIFICATIONS_FROM_EMAIL') || ''
export const DEFAULT_FROM_NAME = Deno.env.get('APPOINTMENT_NOTIFICATIONS_FROM_NAME') || 'PlanesPro'
export const SYSTEM_RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

const encoder = new TextEncoder()
const decoder = new TextDecoder()

let cachedCryptoKey: Promise<CryptoKey> | null = null

export function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function normalizeProvider(value: unknown) {
  return normalizeString(value).toLowerCase()
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function getCryptoKey() {
  if (!EMAIL_CHANNELS_MASTER_KEY) {
    throw new Error('EMAIL_CHANNELS_MASTER_KEY no configurada en Supabase')
  }

  if (!cachedCryptoKey) {
    cachedCryptoKey = crypto.subtle
      .digest('SHA-256', encoder.encode(EMAIL_CHANNELS_MASTER_KEY))
      .then((hash) =>
        crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']),
      )
  }

  return cachedCryptoKey
}

export async function encryptEmailCredentials(credentials: EmailChannelCredentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const payload = encoder.encode(JSON.stringify(credentials))
  const key = await getCryptoKey()
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      payload,
    ),
  )

  return `${bytesToBase64(iv)}.${bytesToBase64(ciphertext)}`
}

export async function decryptEmailCredentials(ciphertext: string): Promise<EmailChannelCredentials> {
  const [ivBase64, payloadBase64] = String(ciphertext || '').split('.')
  if (!ivBase64 || !payloadBase64) {
    throw new Error('Credenciales cifradas invalidas')
  }

  const key = await getCryptoKey()
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(ivBase64),
    },
    key,
    base64ToBytes(payloadBase64),
  )

  const decoded = JSON.parse(decoder.decode(plainBuffer)) as Record<string, unknown>
  const provider = normalizeProvider(decoded.provider)

  if (provider === 'resend') {
    const apiKey = normalizeString(decoded.apiKey)
    if (!apiKey) throw new Error('Credenciales Resend invalidas')
    return { provider: 'resend', apiKey }
  }

  if (provider === 'emailjs') {
    const publicKey = normalizeString(decoded.publicKey)
    const serviceId = normalizeString(decoded.serviceId)
    const templateId = normalizeString(decoded.templateId)
    if (!publicKey || !serviceId || !templateId) {
      throw new Error('Credenciales EmailJS invalidas')
    }
    return { provider: 'emailjs', publicKey, serviceId, templateId }
  }

  throw new Error('Proveedor de credenciales no soportado')
}

export function buildCredentialsHint(credentials: EmailChannelCredentials) {
  if (credentials.provider === 'resend') {
    const tail = credentials.apiKey.slice(-6)
    return `re_...${tail}`
  }

  return `${credentials.provider}`
}

export async function validateChannelCredentials(
  provider: string,
  credentials: EmailChannelCredentials,
): Promise<{ ok: boolean; status: string; message?: string }> {
  if (provider === 'resend' && credentials.provider === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      })

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        return {
          ok: false,
          status: 'invalid',
          message: typeof payload.message === 'string' ? payload.message : 'Resend rechazo la credencial',
        }
      }

      return { ok: true, status: 'validated' }
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo validar Resend',
      }
    }
  }

  if (provider === 'emailjs' && credentials.provider === 'emailjs') {
    return { ok: true, status: 'configured' }
  }

  return {
    ok: false,
    status: 'unsupported',
    message: 'Proveedor no soportado para validacion',
  }
}

export function serializeChannelRow(row: EmailChannelListRow) {
  return {
    id: row.id,
    provider: row.provider,
    channelName: row.channel_name,
    fromName: row.from_name || '',
    fromEmail: row.from_email || '',
    isActive: row.is_active,
    isDefault: row.is_default,
    dailyLimit: Number(row.daily_limit || 100),
    credentialsHint: row.credentials_hint || '',
    metadata: row.metadata || {},
    lastTestedAt: row.last_tested_at,
    lastTestStatus: row.last_test_status || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchPreferredProvider(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email_provider')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return normalizeProvider(data?.email_provider)
}

export async function listUserEmailChannels(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_email_channels')
    .select(
      'id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at',
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []) as EmailChannelListRow[]
}

export async function setUserPreferredProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
) {
  const { error } = await supabase
    .from('profiles')
    .update({ email_provider: provider || null })
    .eq('id', userId)

  if (error) throw error
}

export async function resolveUserEmailChannel(
  supabase: SupabaseClient,
  userId: string,
  options: { requestedProvider?: string; allowSystemFallback?: boolean } = {},
): Promise<ResolvedEmailChannel | null> {
  const requestedProvider = normalizeProvider(options.requestedProvider)
  const preferredProvider = requestedProvider || (await fetchPreferredProvider(supabase, userId))

  let query = supabase
    .from('user_email_channels')
    .select(
      'id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_ciphertext, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at',
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)

  if (preferredProvider) {
    query = query.eq('provider', preferredProvider)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error

  if (!data) {
    if (options.allowSystemFallback && SYSTEM_RESEND_API_KEY && DEFAULT_FROM_EMAIL) {
      return {
        source: 'system_fallback',
        provider: 'resend',
        channelId: 'system-fallback',
        channelName: 'Sistema PlanesPro',
        fromName: DEFAULT_FROM_NAME,
        fromEmail: DEFAULT_FROM_EMAIL,
        dailyLimit: 100,
        credentials: {
          provider: 'resend',
          apiKey: SYSTEM_RESEND_API_KEY,
        },
      }
    }
    return null
  }

  const row = data as EmailChannelRow
  const credentials = await decryptEmailCredentials(row.credentials_ciphertext)
  const fromName = normalizeString(row.from_name) || DEFAULT_FROM_NAME
  const fromEmail = normalizeString(row.from_email)

  if (!fromEmail || !isEmail(fromEmail)) {
    throw new Error(`El canal ${row.channel_name} no tiene un remitente valido`)
  }

  return {
    source: 'user_channel',
    provider: row.provider,
    channelId: row.id,
    channelName: row.channel_name,
    fromName,
    fromEmail,
    dailyLimit: Number(row.daily_limit || 100),
    credentials,
  }
}
