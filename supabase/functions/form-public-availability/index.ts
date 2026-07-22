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

type SlotRow = {
  slot_date?: string | null
  starts_at_local?: string | null
  ends_at_local?: string | null
  starts_at?: string | null
  ends_at?: string | null
  label?: string | null
  timezone?: string | null
  status?: string | null
  disabled?: boolean | null
  capture_link_id?: number | null
  source_channel?: string | null
}

type BookingContextRow = {
  owner_user_id: string
  capture_link_id: number | null
  capture_ref: string | null
  source_channel: string
  link_name: string | null
  campaign_name: string | null
  timezone: string | null
  slot_duration_minutes: number | null
  slot_buffer_minutes: number | null
  allow_public_booking: boolean | null
}

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

function sanitizeCaptureRef(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64)
}

function resolveCaptureRefFromCandidates(...candidates: string[]) {
  const normalized = candidates.map((value) => sanitizeCaptureRef(value)).filter(Boolean)
  if (!normalized.length) return ''

  let best = normalized[0]
  for (const candidate of normalized.slice(1)) {
    if (candidate.startsWith(best) && candidate.length > best.length) {
      best = candidate
      continue
    }
    if (!best.startsWith(candidate) && candidate.length > best.length) {
      best = candidate
    }
  }
  return best
}

function normalizeDate(value: string | null) {
  const raw = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

function diffDaysInclusive(from: string, to: string) {
  const startMs = Date.parse(`${from}T12:00:00Z`)
  const endMs = Date.parse(`${to}T12:00:00Z`)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 21
  return Math.max(1, Math.min(60, Math.round((endMs - startMs) / 86400000) + 1))
}

function normalizeSourceChannel(value: string | null, captureRef: string) {
  const explicit = String(value || '').trim().toLowerCase()
  if (explicit === 'pb' || explicit === 'general') return explicit
  return captureRef ? 'pb' : 'general'
}

function resolveRequestContext(request: Request) {
  const url = new URL(request.url)
  const referer = String(request.headers.get('referer') || request.headers.get('referrer') || '').trim()
  const today = new Date().toISOString().slice(0, 10)

  let refererUrl: URL | null = null
  try {
    refererUrl = referer ? new URL(referer) : null
  } catch {
    refererUrl = null
  }

  const captureRef = resolveCaptureRefFromCandidates(
    url.searchParams.get('ref') || '',
    refererUrl?.searchParams.get('ref') || '',
  )
  const sourceChannel = normalizeSourceChannel(
    url.searchParams.get('source_channel') || url.searchParams.get('form_channel'),
    captureRef,
  )
  const from =
    normalizeDate(url.searchParams.get('from')) ||
    normalizeDate(url.searchParams.get('date')) ||
    today
  const to =
    normalizeDate(url.searchParams.get('to')) ||
    addDaysIso(from, sourceChannel === 'pb' ? 30 : 21)
  const sourcePath = url.searchParams.get('source_path') || refererUrl?.pathname || ''
  const sourceUrl = url.searchParams.get('source_url') || referer || ''
  const sourceHostname = url.searchParams.get('source_hostname') || refererUrl?.hostname || ''

  return {
    captureRef,
    sourceChannel,
    from,
    to,
    days: diffDaysInclusive(from, to),
    sourcePath,
    sourceUrl,
    sourceHostname,
  }
}

function normalizeSlot(row: SlotRow) {
  const startsAt = String(row.starts_at_local || row.starts_at || '').trim()
  const endsAt = String(row.ends_at_local || row.ends_at || '').trim()
  const status = String(row.status || '').trim() || (row.disabled ? 'busy' : 'free')
  return {
    starts_at: startsAt,
    ends_at: endsAt,
    label: String(row.label || startsAt.slice(11, 16)).trim(),
    timezone: String(row.timezone || 'America/Santiago').trim(),
    status,
    disabled: Boolean(row.disabled),
    source_channel: String(row.source_channel || '').trim(),
    capture_link_id: row.capture_link_id ?? null,
  }
}

function buildSlotGrid(slots: ReturnType<typeof normalizeSlot>[]) {
  const byDate = new Map<string, ReturnType<typeof normalizeSlot>[]>()

  for (const slot of slots) {
    const date = String(slot.starts_at || '').slice(0, 10)
    if (!date) continue
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(slot)
  }

  return Array.from(byDate.entries()).map(([date, daySlots]) => ({
    date,
    enabled: daySlots.length > 0,
    slots: daySlots.sort((left, right) => String(left.starts_at).localeCompare(String(right.starts_at))),
  }))
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const context = resolveRequestContext(request)

    const [{ data: availabilityRows, error: availabilityError }, { data: bookingContextRows, error: contextError }] =
      await Promise.all([
        supabase.rpc('get_planespro_public_available_slots', {
          p_capture_ref: context.captureRef || null,
          p_source_channel: context.sourceChannel,
          p_start_date: context.from,
          p_days: context.days,
        }),
        supabase.rpc('resolve_planespro_booking_context', {
          p_capture_ref: context.captureRef || null,
          p_source_channel: context.sourceChannel,
        }),
      ])

    if (availabilityError) {
      console.error('form-public-availability availability error', availabilityError)
      return new Response(JSON.stringify({ error: availabilityError.message }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (contextError) {
      console.error('form-public-availability context error', contextError)
      return new Response(JSON.stringify({ error: contextError.message }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const bookingContext = Array.isArray(bookingContextRows)
      ? (bookingContextRows[0] as BookingContextRow | undefined)
      : (bookingContextRows as BookingContextRow | null)

    const normalizedSlots = Array.isArray(availabilityRows)
      ? availabilityRows.map((row) => normalizeSlot((row || {}) as SlotRow))
      : []
    const freeSlots = normalizedSlots.filter((slot) => !slot.disabled)
    const ownerUserId = bookingContext?.owner_user_id || ''

    const { data: ownerProfile } = ownerUserId
      ? await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', ownerUserId)
          .maybeSingle()
      : { data: null }

    const payload = {
      ok: true,
      source: 'supabase',
      from: context.from,
      to: context.to,
      source_channel: bookingContext?.source_channel || context.sourceChannel,
      slots: freeSlots,
      slot_grid: buildSlotGrid(normalizedSlots),
      advisor: ownerProfile
        ? {
            id: ownerProfile.id,
            email: ownerProfile.email,
            full_name: ownerProfile.full_name,
          }
        : null,
      capture_link: bookingContext?.capture_link_id
        ? {
            id: bookingContext.capture_link_id,
            slug: bookingContext.capture_ref,
            label: bookingContext.link_name,
            campaign_name: bookingContext.campaign_name,
          }
        : null,
      booking: bookingContext
        ? {
            timezone: bookingContext.timezone || 'America/Santiago',
            slot_duration_minutes: bookingContext.slot_duration_minutes ?? 45,
            slot_buffer_minutes: bookingContext.slot_buffer_minutes ?? 15,
            allow_public_booking: bookingContext.allow_public_booking ?? true,
          }
        : null,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('form-public-availability fatal error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
