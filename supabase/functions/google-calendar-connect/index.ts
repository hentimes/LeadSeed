import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

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

type ConnectPayload = {
  provider_token?: string
  provider_refresh_token?: string
  expires_in?: number
  scope?: string
}

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

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return ''
  return token.trim()
}

function expiresAt(expiresIn?: number) {
  const safeSeconds = Number.isFinite(Number(expiresIn)) ? Math.max(60, Math.min(Number(expiresIn), 86400)) : 3300
  return new Date(Date.now() + safeSeconds * 1000).toISOString()
}

async function getAuthenticatedUser(accessToken: string) {
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    throw new Error('Unauthorized')
  }
  return data.user
}

async function fetchGoogleIdentity(providerToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${providerToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Google token rejected')
  }

  const data = await response.json() as Record<string, unknown>
  return {
    email: typeof data.email === 'string' ? data.email : '',
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const accessToken = bearerToken(request)
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const user = await getAuthenticatedUser(accessToken)
    const payload = await request.json() as ConnectPayload
    const providerToken = String(payload.provider_token || '').trim()
    const providerRefreshToken = String(payload.provider_refresh_token || '').trim()

    if (!providerToken && !providerRefreshToken) {
      return new Response(JSON.stringify({ error: 'Missing Google provider token' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const googleIdentity = providerToken ? await fetchGoogleIdentity(providerToken) : { email: '' }
    const tokenScope = String(payload.scope || 'https://www.googleapis.com/auth/calendar').trim()
    const tokenExpiresAt = providerToken ? expiresAt(payload.expires_in) : null

    const { data: existing } = await supabase
      .from('user_calendar_connections')
      .select('refresh_token, access_token, google_email')
      .eq('user_id', user.id)
      .maybeSingle()

    const mergedRefreshToken = providerRefreshToken || existing?.refresh_token || null
    const mergedAccessToken = providerToken || existing?.access_token || null
    const mergedGoogleEmail = googleIdentity.email || existing?.google_email || user.email || null

    const { error: upsertError } = await supabase
      .from('user_calendar_connections')
      .upsert({
        user_id: user.id,
        provider: 'google',
        google_email: mergedGoogleEmail,
        calendar_id: 'primary',
        refresh_token: mergedRefreshToken,
        access_token: mergedAccessToken,
        token_scope: tokenScope,
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_status: 'idle',
        last_sync_error: null,
      }, { onConflict: 'user_id' })

    if (upsertError) throw upsertError

    return new Response(JSON.stringify({
      ok: true,
      provider: 'google',
      google_email: mergedGoogleEmail,
      is_connected: Boolean(mergedRefreshToken || mergedAccessToken),
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('google-calendar-connect error', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
