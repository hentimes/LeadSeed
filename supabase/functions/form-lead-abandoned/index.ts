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

type LeadPayload = Record<string, unknown>

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

function firstString(payload: LeadPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Canales publicos que se dejan pasar tal cual al RPC.
 *
 * La fuente de verdad es la tabla `form_types` (migracion 093), que hoy tiene
 * `pb`, `retiro` y `form`; `general` no esta ahi porque no es un tipo de link,
 * es el caso sin link. Se replica aca como lista estatica para no meter una
 * consulta por cada envio; si se registra un tipo nuevo en `form_types`, hay
 * que agregarlo aqui tambien.
 */
const CANALES_PUBLICOS = new Set(['general', 'pb', 'retiro', 'form'])

function normalizeSourceChannel(value: string) {
  const normalized = value.trim().toLowerCase()
  return CANALES_PUBLICOS.has(normalized) ? normalized : ''
}

function normalizeCaptureRef(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64)
}

function resolveCaptureRefFromCandidates(...candidates: string[]) {
  const normalized = candidates.map((value) => normalizeCaptureRef(value)).filter(Boolean)
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

function inferSourceContext(payload: LeadPayload, request: Request) {
  const referer = request.headers.get('referer') || ''
  const origin = request.headers.get('origin') || ''
  const sourceUrl = firstString(payload, 'source_url', 'page_url', 'url') || referer

  let parsedUrl: URL | null = null
  try {
    parsedUrl = sourceUrl ? new URL(sourceUrl) : referer ? new URL(referer) : null
  } catch {
    parsedUrl = null
  }

  const explicitChannel = normalizeSourceChannel(firstString(payload, 'source_channel', 'form_channel'))
  const payloadCaptureRef = firstString(payload, 'capture_ref', 'ref')
  const queryCaptureRef = parsedUrl?.searchParams.get('ref') || ''
  const captureRef = resolveCaptureRefFromCandidates(payloadCaptureRef, queryCaptureRef)
  const pathFromPayload = firstString(payload, 'source_path', 'page_path', 'pathname')
  const sourcePath = pathFromPayload || parsedUrl?.pathname || ''
  const sourceHostname = firstString(payload, 'source_hostname', 'hostname', 'host') || parsedUrl?.hostname || ''

  // La ruta manda por encima de "tiene ref", porque un ref existe en los tres
  // tipos de formulario y por si solo no dice de cual viene. Antes se miraba
  // primero el ref y por eso un envio desde /retiro-tecnico-extranjero/<ref>
  // se etiquetaba 'pb'.
  const channelFromPath = sourcePath.startsWith('/retiro-tecnico-extranjero')
    ? 'retiro'
    : sourcePath.startsWith('/pb')
      ? 'pb'
      : sourcePath.startsWith('/form')
        ? 'form'
        : ''

  const inferredChannel =
    explicitChannel ||
    channelFromPath ||
    (captureRef ? 'pb' : '') ||
    'general'

  return {
    capture_ref: captureRef || '',
    first_touch_ref: resolveCaptureRefFromCandidates(firstString(payload, 'first_touch_ref'), captureRef) || '',
    source_channel: inferredChannel,
    source_form_variant: firstString(payload, 'source_form_variant', 'form_variant') || inferredChannel,
    source_hostname: sourceHostname || (origin ? new URL(origin).hostname : ''),
    source_path: sourcePath,
    source_url: sourceUrl,
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
    const payload = await request.json().catch(() => ({}))
    const normalizedPayload =
      typeof payload === 'object' && payload ? { ...(payload as Record<string, unknown>) } : {}

    Object.assign(normalizedPayload, inferSourceContext(normalizedPayload, request))

    const { data, error } = await supabase.rpc('record_planespro_public_abandonment', {
      p_payload: normalizedPayload,
    })

    if (error) {
      console.error('record_planespro_public_abandonment error', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('form-lead-abandoned fatal error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
