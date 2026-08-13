import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import {
  decryptEmailCredentials,
  isEmail,
  normalizeString,
  resolveUserEmailChannel,
} from '../_shared/emailChannels.ts'
import { fetchWithTimeout } from '../_shared/http.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || ''
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || ''
const MAX_DELIVERIES_PER_REQUEST = 100

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type DeliveryInput = {
  to?: string
  leadId?: string
  leadName?: string
  subject?: string
  html?: string
  text?: string
  attachments?: Array<{ filename?: string; content?: string }>
}

type SendEmailRequestBody = {
  deliveries?: DeliveryInput[]
  requestedProvider?: string
  requestedChannelId?: string
}

type GoogleConnectionRow = {
  user_id: string
  google_email: string | null
  refresh_token: string | null
  access_token: string | null
  token_expires_at: string | null
  token_scope: string | null
}

type DeliveryChannel =
  | {
      provider: 'resend'
      fromName: string
      fromEmail: string
      apiKey: string
    }
  | {
      provider: 'gmail'
      fromName: string
      fromEmail: string
      accessToken: string
    }

type DeliveryResult = {
  to: string
  ok: boolean
  error?: string
}

const allowedOrigins = new Set([
  'https://planespro.cl',
  'https://www.planespro.cl',
  'https://form.planespro.cl',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
])

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && (allowedOrigins.has(origin) || origin.startsWith('chrome-extension://'))
      ? origin
      : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function normalizeAttachments(input: unknown) {
  if (!Array.isArray(input)) return []
  return input
    .map((entry) => ({
      filename: normalizeString((entry as Record<string, unknown>)?.filename),
      content: normalizeString((entry as Record<string, unknown>)?.content),
    }))
    .filter((entry) => entry.filename && entry.content)
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function encodeBase64Url(value: string) {
  return bytesToBase64(new TextEncoder().encode(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function toIsoExpiry(expiresIn: unknown) {
  const safeSeconds = Number.isFinite(Number(expiresIn)) ? Math.max(60, Number(expiresIn)) : 3300
  return new Date(Date.now() + safeSeconds * 1000).toISOString()
}

function shouldRefreshToken(connection: GoogleConnectionRow) {
  if (!connection.refresh_token) return false
  if (!connection.access_token) return true
  if (!connection.token_expires_at) return true
  return new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
}

async function refreshGoogleAccessToken(connection: GoogleConnectionRow) {
  if (!connection.refresh_token) throw new Error('Google refresh token is missing')
  if (!GOOGLE_OAUTH_CLIENT_ID) throw new Error('Google OAuth client id is not configured')

  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    refresh_token: connection.refresh_token,
    grant_type: 'refresh_token',
  })

  if (GOOGLE_OAUTH_CLIENT_SECRET) {
    body.set('client_secret', GOOGLE_OAUTH_CLIENT_SECRET)
  }

  const response = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(typeof payload.error_description === 'string' ? payload.error_description : 'Google token refresh failed')
  }

  const accessToken = String(payload.access_token)
  const tokenExpiresAt = toIsoExpiry(payload.expires_in)

  const { error } = await supabase
    .from('user_calendar_connections')
    .update({
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  if (error) throw error
  return accessToken
}

async function getGoogleAccessToken(connection: GoogleConnectionRow) {
  if (shouldRefreshToken(connection)) {
    return refreshGoogleAccessToken(connection)
  }

  if (!connection.access_token) {
    throw new Error('Google access token is missing')
  }

  return connection.access_token
}

function escapeMimeHeader(value: string) {
  return value.replace(/\r?\n/g, ' ').trim()
}

function buildGmailRawMessage(
  fromName: string,
  fromEmail: string,
  delivery: Required<Pick<DeliveryInput, 'to' | 'subject'>> & Pick<DeliveryInput, 'html' | 'text' | 'attachments'>,
) {
  const mixedBoundary = `mix_${crypto.randomUUID().replace(/-/g, '')}`
  const altBoundary = `alt_${crypto.randomUUID().replace(/-/g, '')}`
  const lines: string[] = [
    `From: ${escapeMimeHeader(fromName)} <${fromEmail}>`,
    `To: ${delivery.to}`,
    `Subject: ${escapeMimeHeader(delivery.subject)}`,
    'MIME-Version: 1.0',
  ]

  const hasAttachments = Array.isArray(delivery.attachments) && delivery.attachments.length > 0
  const hasHtml = Boolean(delivery.html)
  const hasText = Boolean(delivery.text)

  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, '', `--${mixedBoundary}`)
  }

  if (hasHtml && hasText) {
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`, '')
    lines.push(`--${altBoundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 7bit', '', delivery.text || '', '')
    lines.push(`--${altBoundary}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: 7bit', '', delivery.html || '', '')
    lines.push(`--${altBoundary}--`)
  } else if (hasHtml) {
    lines.push('Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: 7bit', '', delivery.html || '')
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 7bit', '', delivery.text || '')
  }

  if (hasAttachments) {
    for (const attachment of delivery.attachments || []) {
      lines.push(
        '',
        `--${mixedBoundary}`,
        'Content-Type: application/octet-stream; name="' + escapeMimeHeader(attachment.filename || 'archivo') + '"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="' + escapeMimeHeader(attachment.filename || 'archivo') + '"',
        '',
        attachment.content || '',
      )
    }
    lines.push('', `--${mixedBoundary}--`)
  }

  return encodeBase64Url(lines.join('\r\n'))
}

async function resolveRequester(request: Request) {
  const authorization = request.headers.get('Authorization') || request.headers.get('authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { userId: '', error: 'Missing authorization token' }
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.id) {
    return { userId: '', error: 'Invalid session' }
  }

  return { userId: data.user.id, error: '' }
}

async function sendResendMessage(
  apiKey: string,
  fromName: string,
  fromEmail: string,
  delivery: Required<Pick<DeliveryInput, 'to' | 'subject'>> &
    Pick<DeliveryInput, 'html' | 'text' | 'attachments'>,
) {
  const response = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [delivery.to],
      subject: delivery.subject,
      html: delivery.html,
      text: delivery.text,
      attachments: delivery.attachments,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'Resend rejected delivery')
  }
}

async function sendGmailMessage(
  accessToken: string,
  fromName: string,
  fromEmail: string,
  delivery: Required<Pick<DeliveryInput, 'to' | 'subject'>> &
    Pick<DeliveryInput, 'html' | 'text' | 'attachments'>,
) {
  const raw = buildGmailRawMessage(fromName, fromEmail, delivery)
  const response = await fetchWithTimeout('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof payload.error === 'object' && payload.error && 'message' in payload.error ? String((payload.error as Record<string, unknown>).message || '') : 'Gmail rejected delivery')
  }
}

async function resolveGmailChannel(userId: string) {
  const { data, error } = await supabase
    .from('user_calendar_connections')
    .select('user_id, google_email, refresh_token, access_token, token_expires_at, token_scope')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const connection = data as GoogleConnectionRow
  const scope = normalizeString(connection.token_scope)
  if (!scope.includes('https://www.googleapis.com/auth/gmail.send')) {
    throw new Error('La cuenta Google conectada no tiene permiso de envio Gmail')
  }

  const accessToken = await getGoogleAccessToken(connection)
  const fromEmail = normalizeString(connection.google_email)
  if (!fromEmail || !isEmail(fromEmail)) {
    throw new Error('La cuenta Google conectada no tiene un correo valido')
  }

  return {
    provider: 'gmail' as const,
    fromName: fromEmail.split('@')[0],
    fromEmail,
    accessToken,
  }
}

async function resolveDeliveryChannel(userId: string, requestedProvider: string, requestedChannelId: string): Promise<DeliveryChannel | null> {
  const normalizedProvider = normalizeString(requestedProvider)
  const normalizedChannelId = normalizeString(requestedChannelId)

  if (normalizedProvider === 'gmail') {
    return resolveGmailChannel(userId)
  }

  if (normalizedChannelId) {
    const { data, error } = await supabase
      .from('user_email_channels')
      .select('id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_ciphertext, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at')
      .eq('user_id', userId)
      .eq('id', normalizedChannelId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error('El canal remitente seleccionado no existe o no esta activo')
    }

    const row = data as Record<string, unknown>
    const credentials = await decryptEmailCredentials(String(row.credentials_ciphertext || ''))
    if (normalizeString(String(row.provider || '')) !== 'resend' || credentials.provider !== 'resend') {
      throw new Error('El canal remitente seleccionado no es compatible con envio backend')
    }

    return {
      provider: 'resend',
      fromName: normalizeString(row.from_name) || 'Canal Resend',
      fromEmail: normalizeString(row.from_email),
      apiKey: credentials.apiKey,
    }
  }

  const preferredProvider = normalizedProvider === 'gmail' || normalizedProvider === 'resend' ? normalizedProvider : 'resend'
  if (preferredProvider === 'gmail') {
    return resolveGmailChannel(userId)
  }

  const channel = await resolveUserEmailChannel(supabase, userId, {
    requestedProvider: preferredProvider,
    allowSystemFallback: false,
  })
  if (!channel) return null
  if (channel.provider !== 'resend' || channel.credentials.provider !== 'resend') {
    throw new Error('El canal activo del usuario no es compatible con envios backend.')
  }

  return {
    provider: 'resend',
    fromName: channel.fromName,
    fromEmail: channel.fromEmail,
    apiKey: channel.credentials.apiKey,
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const auth = await resolveRequester(request)
    if (auth.error) {
      return new Response(JSON.stringify({ ok: false, error: auth.error }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const body = (await request.json().catch(() => ({}))) as SendEmailRequestBody
    const rawDeliveries = Array.isArray(body.deliveries) ? body.deliveries : []

    if (!rawDeliveries.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No deliveries received' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (rawDeliveries.length > MAX_DELIVERIES_PER_REQUEST) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Maximo ${MAX_DELIVERIES_PER_REQUEST} correos por solicitud`,
        }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        },
      )
    }

    const channel = await resolveDeliveryChannel(
      auth.userId,
      normalizeString(body.requestedProvider),
      normalizeString(body.requestedChannelId),
    )
    if (!channel) {
      return new Response(JSON.stringify({ ok: false, error: 'Configura un canal de correo activo en Ajustes.' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const deliveries: DeliveryResult[] = []
    const errors: string[] = []

    for (const entry of rawDeliveries) {
      const to = normalizeString(entry.to)
      const subject = normalizeString(entry.subject)
      const html = normalizeString(entry.html)
      const text = normalizeString(entry.text)
      const attachments = normalizeAttachments(entry.attachments)

      if (!isEmail(to)) {
        const error = 'Correo destinatario invalido'
        deliveries.push({ to, ok: false, error })
        errors.push(error)
        continue
      }

      if (!subject) {
        const error = `Asunto faltante para ${to}`
        deliveries.push({ to, ok: false, error })
        errors.push(error)
        continue
      }

      if (!html && !text) {
        const error = `Contenido vacio para ${to}`
        deliveries.push({ to, ok: false, error })
        errors.push(error)
        continue
      }

      try {
        if (channel.provider === 'gmail') {
          await sendGmailMessage(channel.accessToken, channel.fromName, channel.fromEmail, {
            to,
            subject,
            html: html || undefined,
            text: text || undefined,
            attachments,
          })
        } else {
          await sendResendMessage(channel.apiKey, channel.fromName, channel.fromEmail, {
            to,
            subject,
            html: html || undefined,
            text: text || undefined,
            attachments,
          })
        }
        deliveries.push({ to, ok: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected send-email error'
        deliveries.push({ to, ok: false, error: message })
        errors.push(`${to}: ${message}`)
      }
    }

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        deliveries,
        errors,
        provider: channel.provider,
        fromEmail: channel.fromEmail,
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected send-email fatal error',
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    )
  }
})
