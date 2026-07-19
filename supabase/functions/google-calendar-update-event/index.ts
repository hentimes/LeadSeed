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
  calendar_id: string | null
  refresh_token: string | null
  access_token: string | null
  token_expires_at: string | null
}

type AppointmentRow = {
  id: string
  user_id: string
  start_time: string
  end_time: string
  timezone: string | null
  status: string
  google_event_id: string | null
  meet_link: string | null
}

type ParticipantRow = {
  email: string
  name: string | null
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

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeAction(value: unknown) {
  return value === 'reschedule' || value === 'cancel' ? value : ''
}

function shouldRefreshToken(connection: CalendarConnectionRow) {
  if (!connection.refresh_token) return false
  if (!connection.access_token) return true
  if (!connection.token_expires_at) return true
  return new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
}

async function getAuthenticatedUserId(token: string) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Unauthorized')
  }
  return data.user.id
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

async function markAppointmentSync(appointmentId: string, status: 'synced' | 'error' | 'skipped', errorMessage: string | null) {
  await supabase
    .from('appointments')
    .update({
      google_sync_status: status,
      google_sync_error: errorMessage ? errorMessage.slice(0, 500) : null,
      google_synced_at: status === 'synced' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
}

async function fetchParticipants(appointment: AppointmentRow) {
  const { data, error } = await supabase
    .from('appointment_participants')
    .select('email, name')
    .eq('appointment_id', appointment.id)
    .eq('user_id', appointment.user_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as ParticipantRow[]
}

async function patchGoogleEvent(accessToken: string, calendarId: string, appointment: AppointmentRow, participants: ParticipantRow[]) {
  const timezone = appointment.timezone || 'America/Santiago'
  const attendees = participants.map((participant) => ({
    email: participant.email,
    displayName: participant.name || undefined,
  }))

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(appointment.google_event_id || '')}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: {
          dateTime: appointment.start_time,
          timeZone: timezone,
        },
        end: {
          dateTime: appointment.end_time,
          timeZone: timezone,
        },
        attendees,
      }),
    },
  )

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined
    throw new Error(typeof error?.message === 'string' ? error.message : 'Google Events Patch failed')
  }
}

async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (response.status === 404 || response.status === 410) return

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    const error = payload.error as Record<string, unknown> | undefined
    throw new Error(typeof error?.message === 'string' ? error.message : 'Google Events Delete failed')
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

  let appointmentId = ''

  try {
    const token = bearerToken(request)
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const requesterUserId = await getAuthenticatedUserId(token)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    appointmentId = String(body.appointment_id || '').trim()
    const action = normalizeAction(body.action)

    if (!isUuid(appointmentId) || !action) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, user_id, start_time, end_time, timezone, status, google_event_id, meet_link')
      .eq('id', appointmentId)
      .maybeSingle<AppointmentRow>()

    if (appointmentError) throw appointmentError

    if (!appointment || appointment.user_id !== requesterUserId) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (!appointment.google_event_id) {
      await markAppointmentSync(appointment.id, 'skipped', null)
      return new Response(JSON.stringify({ ok: true, status: 'skipped', reason: 'google_event_missing' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('user_id, calendar_id, refresh_token, access_token, token_expires_at')
      .eq('user_id', requesterUserId)
      .maybeSingle<CalendarConnectionRow>()

    if (connectionError) throw connectionError

    if (!connection) {
      await markAppointmentSync(appointment.id, 'error', 'Google Calendar is not connected')
      return new Response(JSON.stringify({ error: 'Google Calendar is not connected' }), {
        status: 409,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getAccessToken(connection)
    const calendarId = connection.calendar_id || 'primary'

    if (action === 'cancel') {
      await deleteGoogleEvent(accessToken, calendarId, appointment.google_event_id)
      await markAppointmentSync(appointment.id, 'synced', null)
      return new Response(JSON.stringify({ ok: true, status: 'synced', action }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const participants = await fetchParticipants(appointment)
    await patchGoogleEvent(accessToken, calendarId, appointment, participants)
    await markAppointmentSync(appointment.id, 'synced', null)

    return new Response(JSON.stringify({ ok: true, status: 'synced', action }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('google-calendar-update-event error', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    if (appointmentId && isUuid(appointmentId)) {
      await markAppointmentSync(appointmentId, 'error', message).catch(() => null)
    }

    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
