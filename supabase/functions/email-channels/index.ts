import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import {
  buildCredentialsHint,
  type EmailChannelListRow,
  encryptEmailCredentials,
  isEmail,
  listUserEmailChannels,
  normalizeProvider,
  normalizeString,
  serializeChannelRow,
  setUserPreferredProvider,
  validateChannelCredentials,
} from '../_shared/emailChannels.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const allowedOrigins = new Set([
  'https://planespro.cl',
  'https://www.planespro.cl',
  'https://form.planespro.cl',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
])

type ChannelPayload = {
  id?: string
  provider?: string
  channelName?: string
  fromName?: string
  fromEmail?: string
  isActive?: boolean
  isDefault?: boolean
  dailyLimit?: number
  credentials?: Record<string, unknown>
}

const MULTI_CHANNELS_FEATURE = 'pro:multiple_email_channels'
const DEFAULT_CHANNEL_LIMIT = 1
const EXTENDED_CHANNEL_LIMIT = 6

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && (allowedOrigins.has(origin) || origin.startsWith('chrome-extension://'))
      ? origin
      : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  }
}

async function resolveRequester(request: Request) {
  const authorization = request.headers.get('Authorization') || request.headers.get('authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { userId: '', error: 'Missing authorization token' }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.id) {
    return { userId: '', error: 'Invalid session' }
  }

  return { userId: data.user.id, error: '' }
}

async function resolveChannelLimit(userId: string) {
  const now = new Date().toISOString()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, plan_id')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError
  if (profile?.role === 'admin') return EXTENDED_CHANNEL_LIMIT

  const { data: overrideRows, error: overrideError } = await supabase
    .from('user_feature_overrides')
    .select('feature_id, expires_at')
    .eq('user_id', userId)
    .eq('feature_id', MULTI_CHANNELS_FEATURE)

  if (overrideError) throw overrideError

  const hasActiveOverride = Array.isArray(overrideRows) && overrideRows.some((row) => !row.expires_at || row.expires_at > now)
  if (hasActiveOverride) return EXTENDED_CHANNEL_LIMIT

  if (profile?.plan_id) {
    const { data: planFeatureRows, error: planFeatureError } = await supabase
      .from('plan_features')
      .select('feature_id')
      .eq('plan_id', profile.plan_id)
      .eq('feature_id', MULTI_CHANNELS_FEATURE)
      .limit(1)

    if (planFeatureError) throw planFeatureError
    if (Array.isArray(planFeatureRows) && planFeatureRows.length > 0) return EXTENDED_CHANNEL_LIMIT
  }

  return DEFAULT_CHANNEL_LIMIT
}

function normalizeDailyLimit(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 100
  return Math.max(1, Math.min(50000, Math.round(parsed)))
}

function buildCredentials(provider: string, payload: ChannelPayload) {
  if (provider === 'resend') {
    const apiKey = normalizeString(payload.credentials?.apiKey)
    if (!apiKey) {
      throw new Error('Ingresa una API key valida de Resend')
    }

    return {
      provider: 'resend' as const,
      apiKey,
    }
  }

  if (provider === 'emailjs') {
    const publicKey = normalizeString(payload.credentials?.publicKey)
    const serviceId = normalizeString(payload.credentials?.serviceId)
    const templateId = normalizeString(payload.credentials?.templateId)
    if (!publicKey || !serviceId || !templateId) {
      throw new Error('Completa las credenciales de EmailJS')
    }

    return {
      provider: 'emailjs' as const,
      publicKey,
      serviceId,
      templateId,
    }
  }

  throw new Error('Proveedor de correo no soportado')
}

async function clearOtherDefaults(userId: string, exceptId?: string) {
  let query = supabase
    .from('user_email_channels')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true)
    .is('deleted_at', null)

  if (exceptId) {
    query = query.neq('id', exceptId)
  }

  const { error } = await query
  if (error) throw error
}

async function ensureReplacementDefault(userId: string) {
  const { data, error } = await supabase
    .from('user_email_channels')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) return

  const { error: updateError } = await supabase
    .from('user_email_channels')
    .update({ is_default: true })
    .eq('id', data.id)

  if (updateError) throw updateError
}

async function ensureChannelCapacity(userId: string) {
  const [limit, countResult] = await Promise.all([
    resolveChannelLimit(userId),
    supabase
      .from('user_email_channels')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),
  ])

  if (countResult.error) throw countResult.error

  const total = Number(countResult.count || 0)
  if (total >= limit) {
    if (limit <= 1) {
      throw new Error('Tu plan actual permite un solo canal de correo. Pide acceso a multiples canales para agregar otro.')
    }
    throw new Error(`Puedes registrar hasta ${limit} canales de correo.`)
  }
}

function toChannelRow(data: Record<string, unknown>) {
  return data as unknown as EmailChannelListRow
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  const auth = await resolveRequester(request)
  if (auth.error) {
    return new Response(JSON.stringify({ ok: false, error: auth.error }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (request.method === 'GET') {
      const channels = await listUserEmailChannels(supabase, auth.userId)
      return new Response(
        JSON.stringify({
          ok: true,
          channels: channels.map((row) => serializeChannelRow(row)),
        }),
        { headers: { ...headers, 'Content-Type': 'application/json' } },
      )
    }

    const payload = (await request.json().catch(() => ({}))) as ChannelPayload

    if (request.method === 'POST') {
      await ensureChannelCapacity(auth.userId)

      const provider = normalizeProvider(payload.provider)
      const channelName = normalizeString(payload.channelName)
      const fromName = normalizeString(payload.fromName)
      const fromEmail = normalizeString(payload.fromEmail)
      const isActive = payload.isActive !== false
      const isDefault = payload.isDefault !== false
      const dailyLimit = normalizeDailyLimit(payload.dailyLimit)

      if (!provider) throw new Error('Selecciona un proveedor')
      if (!channelName) throw new Error('Ingresa un nombre para el canal')
      if (!fromEmail || !isEmail(fromEmail)) throw new Error('Ingresa un correo remitente valido')

      const credentials = buildCredentials(provider, payload)
      const validation = await validateChannelCredentials(provider, credentials, { fromEmail })
      if (!validation.ok) throw new Error(validation.message || 'No se pudo validar la credencial')

      const credentialsCiphertext = await encryptEmailCredentials(credentials)
      const credentialsHint = buildCredentialsHint(credentials)

      if (isDefault) {
        await clearOtherDefaults(auth.userId)
      }

      const { data, error } = await supabase
        .from('user_email_channels')
        .insert({
          user_id: auth.userId,
          provider,
          channel_name: channelName,
          from_name: fromName || null,
          from_email: fromEmail,
          is_active: isActive,
          is_default: isDefault,
          daily_limit: dailyLimit,
          credentials_ciphertext: credentialsCiphertext,
          credentials_hint: credentialsHint,
          metadata: {
            validation_status: validation.status,
          },
          last_tested_at: new Date().toISOString(),
          last_test_status: validation.status,
        })
        .select('id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at')
        .single()

      if (error) throw error
      await setUserPreferredProvider(supabase, auth.userId, provider)

      return new Response(JSON.stringify({ ok: true, channel: serializeChannelRow(toChannelRow(data as Record<string, unknown>)) }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'PATCH') {
      const channelId = normalizeString(payload.id)
      if (!channelId) throw new Error('Canal no valido')

      const { data: existing, error: existingError } = await supabase
        .from('user_email_channels')
        .select('id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_ciphertext, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at')
        .eq('id', channelId)
        .eq('user_id', auth.userId)
        .is('deleted_at', null)
        .single()

      if (existingError || !existing) throw new Error('Canal no encontrado')

      const provider = normalizeProvider(payload.provider || existing.provider)
      const channelName = normalizeString(payload.channelName) || existing.channel_name
      const fromName = normalizeString(payload.fromName) || existing.from_name || ''
      const fromEmail = normalizeString(payload.fromEmail) || existing.from_email || ''
      const isActive = typeof payload.isActive === 'boolean' ? payload.isActive : existing.is_active
      const isDefault = typeof payload.isDefault === 'boolean' ? payload.isDefault : existing.is_default
      const dailyLimit = typeof payload.dailyLimit === 'number' ? normalizeDailyLimit(payload.dailyLimit) : Number(existing.daily_limit || 100)

      if (!fromEmail || !isEmail(fromEmail)) throw new Error('Ingresa un correo remitente valido')

      let credentialsCiphertext = existing.credentials_ciphertext
      let credentialsHint = existing.credentials_hint || ''
      let lastTestStatus = existing.last_test_status || ''
      let lastTestedAt = existing.last_tested_at
      let metadata = (existing.metadata || {}) as Record<string, unknown>

      if (payload.credentials && Object.keys(payload.credentials).length > 0) {
        const credentials = buildCredentials(provider, payload)
        const validation = await validateChannelCredentials(provider, credentials, { fromEmail })
        if (!validation.ok) throw new Error(validation.message || 'No se pudo validar la credencial')
        credentialsCiphertext = await encryptEmailCredentials(credentials)
        credentialsHint = buildCredentialsHint(credentials)
        lastTestStatus = validation.status
        lastTestedAt = new Date().toISOString()
        metadata = {
          ...metadata,
          validation_status: validation.status,
        }
      }

      if (isDefault) {
        await clearOtherDefaults(auth.userId, channelId)
      }

      const { data, error } = await supabase
        .from('user_email_channels')
        .update({
          provider,
          channel_name: channelName,
          from_name: fromName || null,
          from_email: fromEmail,
          is_active: isActive,
          is_default: isDefault,
          daily_limit: dailyLimit,
          credentials_ciphertext: credentialsCiphertext,
          credentials_hint: credentialsHint,
          metadata,
          last_tested_at: lastTestedAt,
          last_test_status: lastTestStatus,
        })
        .eq('id', channelId)
        .eq('user_id', auth.userId)
        .select('id, user_id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_hint, metadata, last_tested_at, last_test_status, created_at, updated_at, deleted_at')
        .single()

      if (error) throw error
      if (isDefault) {
        await setUserPreferredProvider(supabase, auth.userId, provider)
      }

      return new Response(JSON.stringify({ ok: true, channel: serializeChannelRow(toChannelRow(data as Record<string, unknown>)) }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'DELETE') {
      const channelId = normalizeString(payload.id)
      if (!channelId) throw new Error('Canal no valido')

      const { data: existing, error: existingError } = await supabase
        .from('user_email_channels')
        .select('id, is_default')
        .eq('id', channelId)
        .eq('user_id', auth.userId)
        .is('deleted_at', null)
        .single()

      if (existingError || !existing) throw new Error('Canal no encontrado')

      const { error } = await supabase
        .from('user_email_channels')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          is_default: false,
        })
        .eq('id', channelId)
        .eq('user_id', auth.userId)

      if (error) throw error
      if (existing.is_default) {
        await ensureReplacementDefault(auth.userId)
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected email-channels error',
      }),
      {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    )
  }
})
