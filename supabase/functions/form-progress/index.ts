/**
 * Telemetria de progreso de los formularios publicos.
 *
 * PROCEDENCIA: este archivo se obtuvo con `supabase functions download
 * form-progress` el 2026-08-12, es decir, es el codigo que estaba realmente
 * corriendo en produccion. No se copio del repo `landing-gerow` a proposito, y
 * la razon importa:
 *
 * - la version desplegada acepta los slugs `pb, form, retiro, retiro-v2` y
 *   nueve tipos de evento
 * - el HEAD commiteado de `landing-gerow` solo acepta `pb, form, retiro` y tres
 *   tipos de evento
 * - su arbol de trabajo sin commitear si coincide con lo desplegado
 *
 * Alguien desplego sin commitear. Copiar del HEAD habria tomado la version
 * vieja y, al redesplegar, habria desactivado en silencio el tracking de
 * `retiro-v2` y de seis tipos de evento.
 *
 * Con esto las doce Edge Functions del proyecto viven en este repo y se cierra
 * la regla de dueño unico del protocolo 15.5.
 *
 * Deuda conocida (roadmap 13.4): `KNOWN_FORM_SLUGS` es un allowlist escrito a
 * mano, mientras LeadSeed ya tiene `public.form_types` como registro editable
 * desde la extension. Agregar un tipo de formulario no habilita su telemetria
 * hasta editar y redesplegar esta funcion.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mismo allowlist de origenes que form-leads. Mantener en sync si ese
// archivo cambia sus origenes permitidos.
const allowedOrigins = new Set([
  'https://planespro.cl',
  'https://www.planespro.cl',
  'https://form.planespro.cl',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
])

// Formularios y eventos conocidos. Agregar un formulario nuevo mas
// adelante es sumar un string aca, sin migracion de base de datos: la
// tabla form_progress_events no tiene CHECK sobre estos valores a
// proposito, la validacion vive aca.
const KNOWN_FORM_SLUGS = new Set(['pb', 'form', 'retiro', 'retiro-v2'])
const KNOWN_EVENT_TYPES = new Set([
  'visit', 'step_1', 'step_2',
  'advisory_open', 'bundle_advisory_open', 'bundle_lead_submit',
  'toc_open', 'faq_open', 'hotmart_click',
])

type ProgressPayload = {
  form_slug?: unknown
  capture_ref?: unknown
  event_type?: unknown
  session_id?: unknown
}

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function firstNonEmptyString(value: unknown, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, maxLength) : ''
}

function sanitizeCaptureRef(value: unknown) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text ? text.replace(/[^a-z0-9_-]/g, '').slice(0, 64) : ''
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
    const body = (await request.json().catch(() => ({}))) as ProgressPayload

    const formSlug = firstNonEmptyString(body.form_slug, 32)
    const eventType = firstNonEmptyString(body.event_type, 32)
    const sessionId = firstNonEmptyString(body.session_id, 128)
    const captureRef = sanitizeCaptureRef(body.capture_ref)

    if (!KNOWN_FORM_SLUGS.has(formSlug) || !KNOWN_EVENT_TYPES.has(eventType) || !sessionId) {
      return new Response(JSON.stringify({ error: 'invalid form_slug, event_type or session_id' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // Fire-and-forget: nunca debe bloquear ni asustar al formulario que la
    // llama. Duplicados (reload, doble click, reintento) se ignoran via el
    // unique index (form_slug, session_id, event_type).
    const { error } = await supabase
      .from('form_progress_events')
      .upsert(
        {
          form_slug: formSlug,
          capture_ref: captureRef || null,
          event_type: eventType,
          session_id: sessionId,
        },
        { onConflict: 'form_slug,session_id,event_type', ignoreDuplicates: true },
      )

    if (error) {
      console.warn('form-progress insert error', { message: error.message, code: error.code })
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.warn('form-progress fatal error', error)
    // Telemetria: nunca 500 hacia el formulario publico.
    return new Response(JSON.stringify({ status: 'ignored' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
