import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || ''
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const allowedOrigins = new Set([
  'https://planespro.cl',
  'https://www.planespro.cl',
  'https://form.planespro.cl',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
])

type CalendarConnectionRow = {
  user_id: string
  google_email: string | null
  calendar_id: string | null
  refresh_token: string | null
  access_token: string | null
  token_expires_at: string | null
}

type CalendarSettingsRow = {
  timezone: string | null
}

type FreeBusyRange = {
  start?: string
  end?: string
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

function isoDateOnly(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDays(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 30
  return Math.max(1, Math.min(Math.floor(parsed), 60))
}

function defaultRange(days: number) {
  const from = new Date()
  const to = new Date()
  to.setUTCDate(from.getUTCDate() + days)
  return {
    from: isoDateOnly(from),
    to: isoDateOnly(to),
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
  }
}

function shouldRefreshToken(connection: CalendarConnectionRow) {
  if (!connection.refresh_token) return false
  if (!connection.access_token) return true
  if (!connection.token_expires_at) return true
  return new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
}

async function getAuthenticatedUser(accessToken: string) {
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    throw new Error('Unauthorized')
  }
  return data.user
}

async function markSync(
  userId: string,
  status: 'running' | 'ok' | 'error',
  patch: Record<string, unknown> = {},
) {
  await supabase
    .from('user_calendar_connections')
    .update({
      last_sync_status: status,
      updated_at: new Date().toISOString(),
      ...patch,
    })
    .eq('user_id', userId)
}

async function refreshGoogleAccessToken(connection: CalendarConnectionRow) {
  if (!connection.refresh_token) {
    throw new Error('Google refresh token is missing')
  }

  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error('Google OAuth client id is not configured')
  }

  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    refresh_token: connection.refresh_token,
    grant_type: 'refresh_token',
  })

  if (GOOGLE_OAUTH_CLIENT_SECRET) {
    body.set('client_secret', GOOGLE_OAUTH_CLIENT_SECRET)
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(typeof payload.error_description === 'string' ? payload.error_description : 'Google token refresh failed')
  }

  const expiresIn = Number(payload.expires_in || 3300)
  const tokenExpiresAt = new Date(Date.now() + Math.max(60, expiresIn) * 1000).toISOString()

  const { error } = await supabase
    .from('user_calendar_connections')
    .update({
      access_token: payload.access_token,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  if (error) throw error

  return String(payload.access_token)
}

async function getAccessToken(connection: CalendarConnectionRow) {
  if (shouldRefreshToken(connection)) {
    return refreshGoogleAccessToken(connection)
  }

  if (!connection.access_token) {
    throw new Error('Google access token is missing')
  }

  return connection.access_token
}

async function queryFreeBusy(accessToken: string, calendarId: string, timeMin: string, timeMax: string, timezone: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: timezone,
      items: [{ id: calendarId }],
    }),
  })

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined
    throw new Error(typeof error?.message === 'string' ? error.message : 'Google FreeBusy request failed')
  }

  const calendars = payload.calendars as Record<string, { busy?: FreeBusyRange[]; errors?: unknown[] }> | undefined
  const calendar = calendars?.[calendarId]

  if (calendar?.errors?.length) {
    throw new Error('Google FreeBusy returned calendar errors')
  }

  return calendar?.busy || []
}

function buildGoogleBlockId(range: FreeBusyRange, index: number) {
  return `busy_${index}_${String(range.start || '').replace(/[^0-9TZ]/g, '')}_${String(range.end || '').replace(/[^0-9TZ]/g, '')}`
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

  let userId = ''

  try {
    const accessToken = bearerToken(request)
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const user = await getAuthenticatedUser(accessToken)
    userId = user.id

    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    const days = parseDays(payload.days)
    const range = defaultRange(days)

    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('user_id, google_email, calendar_id, refresh_token, access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (connectionError) throw connectionError

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Google Calendar is not connected' }), {
        status: 409,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    await markSync(user.id, 'running', {
      last_sync_started_at: new Date().toISOString(),
      last_sync_error: null,
    })

    const { data: settings } = await supabase
      .from('user_calendar_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle<CalendarSettingsRow>()

    const timezone = settings?.timezone || 'America/Santiago'
    const calendarId = connection.calendar_id || 'primary'
    const googleAccessToken = await getAccessToken(connection as CalendarConnectionRow)
    const busyRanges = await queryFreeBusy(googleAccessToken, calendarId, range.timeMin, range.timeMax, timezone)

    const { error: deleteError } = await supabase
      .from('user_availability_blocks')
      .delete()
      .eq('user_id', user.id)
      .eq('block_type', 'google')
      .lt('starts_at', range.timeMax)
      .gte('ends_at', range.timeMin)

    if (deleteError) throw deleteError

    const blocks = busyRanges
      .filter((item) => item.start && item.end && new Date(item.end).getTime() > new Date(item.start).getTime())
      .map((item, index) => ({
        user_id: user.id,
        starts_at: item.start,
        ends_at: item.end,
        block_type: 'google',
        note: 'Google Calendar',
        google_event_id: buildGoogleBlockId(item, index),
        google_calendar_id: calendarId,
        metadata: {
          source: 'google_freebusy',
          synced_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

    if (blocks.length > 0) {
      const { error: insertError } = await supabase
        .from('user_availability_blocks')
        .insert(blocks)

      if (insertError) throw insertError
    }

    await markSync(user.id, 'ok', {
      last_sync_finished_at: new Date().toISOString(),
      last_sync_error: null,
    })

    return new Response(JSON.stringify({
      ok: true,
      source: 'google_freebusy',
      calendar_id: calendarId,
      from: range.from,
      to: range.to,
      busy_count: blocks.length,
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('google-calendar-sync error', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    if (userId) {
      await markSync(userId, 'error', {
        last_sync_finished_at: new Date().toISOString(),
        last_sync_error: message,
      }).catch(() => null)
    }

    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
