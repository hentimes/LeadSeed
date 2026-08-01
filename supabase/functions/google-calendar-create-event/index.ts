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

type AppointmentRow = {
  id: string
  user_id: string
  lead_id: string | null
  start_time: string
  end_time: string
  timezone: string | null
  status: string
  google_event_id: string | null
  meet_link: string | null
  notes: string | null
}

type LeadRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  company: string | null
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

function shouldRefreshToken(connection: CalendarConnectionRow) {
  if (!connection.refresh_token) return false
  if (!connection.access_token) return true
  if (!connection.token_expires_at) return true
  return new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
}

async function getAuthenticatedUserId(token: string) {
  if (token === SUPABASE_SERVICE_ROLE_KEY) return null

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

function buildDescription(lead: LeadRow | null, appointment: AppointmentRow) {
  const lines = [
    'Cita generada desde PlanesPro/LeadSeed.',
    lead?.name ? `Lead: ${lead.name}` : '',
    lead?.phone ? `Telefono: ${lead.phone}` : '',
    lead?.email ? `Email: ${lead.email}` : '',
    lead?.company ? `Empresa: ${lead.company}` : '',
    appointment.notes ? `Notas: ${appointment.notes}` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

function extractMeetLink(event: Record<string, unknown>) {
  const hangoutLink = event.hangoutLink
  if (typeof hangoutLink === 'string' && hangoutLink) return hangoutLink

  const conferenceData = event.conferenceData as Record<string, unknown> | undefined
  const entryPoints = conferenceData?.entryPoints as Array<Record<string, unknown>> | undefined
  const videoEntry = entryPoints?.find((entry) => entry.entryPointType === 'video')
  return typeof videoEntry?.uri === 'string' ? videoEntry.uri : ''
}

async function markAppointmentError(appointmentId: string, message: string) {
  await supabase
    .from('appointments')
    .update({
      google_sync_status: 'error',
      google_sync_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
}

async function insertGoogleEvent(
  accessToken: string,
  calendarId: string,
  appointment: AppointmentRow,
  lead: LeadRow | null,
  participants: ParticipantRow[],
) {
  const timezone = appointment.timezone || 'America/Santiago'
  const summary = `Asesoria PlanesPro - ${lead?.name || 'Lead'}`
  const requestId = `meet-${appointment.id.replace(/-/g, '')}`.slice(0, 64)
  const sendUpdates = participants.length > 0 ? 'all' : 'none'

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=${sendUpdates}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description: buildDescription(lead, appointment),
        start: {
          dateTime: appointment.start_time,
          timeZone: timezone,
        },
        end: {
          dateTime: appointment.end_time,
          timeZone: timezone,
        },
        attendees: participants.map((participant) => ({
          email: participant.email,
          displayName: participant.name || undefined,
        })),
        transparency: 'opaque',
        extendedProperties: {
          private: {
            appointment_id: appointment.id,
            lead_id: appointment.lead_id || '',
            source: 'mensajes',
          },
        },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  )

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined
    throw new Error(typeof error?.message === 'string' ? error.message : 'Google Events Insert failed')
  }

  return {
    eventId: String(payload.id || ''),
    meetLink: extractMeetLink(payload),
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

    if (!isUuid(appointmentId)) {
      return new Response(JSON.stringify({ error: 'Invalid appointment id' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, user_id, lead_id, start_time, end_time, timezone, status, google_event_id, meet_link, notes')
      .eq('id', appointmentId)
      .maybeSingle<AppointmentRow>()

    if (appointmentError) throw appointmentError

    if (!appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (requesterUserId && requesterUserId !== appointment.user_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (appointment.google_event_id) {
      return new Response(JSON.stringify({
        ok: true,
        status: 'already_synced',
        google_event_id: appointment.google_event_id,
        meet_link: appointment.meet_link || '',
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('user_id, google_email, calendar_id, refresh_token, access_token, token_expires_at')
      .eq('user_id', appointment.user_id)
      .maybeSingle<CalendarConnectionRow>()

    if (connectionError) throw connectionError

    if (!connection) {
      await markAppointmentError(appointment.id, 'Google Calendar is not connected')
      return new Response(JSON.stringify({ error: 'Google Calendar is not connected' }), {
        status: 409,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data: lead } = appointment.lead_id
      ? await supabase
        .from('leads')
        .select('id, name, phone, email, company')
        .eq('id', appointment.lead_id)
        .maybeSingle<LeadRow>()
      : { data: null }

    const { data: participants, error: participantsError } = await supabase
      .from('appointment_participants')
      .select('email, name')
      .eq('appointment_id', appointment.id)
      .eq('user_id', appointment.user_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (participantsError) throw participantsError

    const accessToken = await getAccessToken(connection)
    const calendarId = connection.calendar_id || 'primary'
    const googleEvent = await insertGoogleEvent(accessToken, calendarId, appointment, lead || null, (participants || []) as ParticipantRow[])

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        google_event_id: googleEvent.eventId,
        meet_link: googleEvent.meetLink || null,
        google_sync_status: 'synced',
        google_sync_error: null,
        google_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    if (updateError) throw updateError

    if (participants?.length) {
      await supabase
        .from('appointment_participants')
        .update({
          invitation_status: 'synced',
          google_sync_error: null,
          google_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('appointment_id', appointment.id)
        .is('deleted_at', null)
    }

    return new Response(JSON.stringify({
      ok: true,
      status: 'synced',
      google_event_id: googleEvent.eventId,
      meet_link: googleEvent.meetLink,
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('google-calendar-create-event error', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    if (appointmentId && isUuid(appointmentId)) {
      await markAppointmentError(appointmentId, message).catch(() => null)
    }

    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers,
    })
  }
})
