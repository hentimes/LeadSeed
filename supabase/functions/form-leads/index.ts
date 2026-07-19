import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UPLOAD_BUCKET = 'planespro-form-uploads'

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

type UploadedAttachment = {
  tempPath: string
  contentType: string
  size: number
}

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://planespro.cl'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function slugifySegment(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'archivo'
  )
}

function getSafeExtension(name: string) {
  const parts = String(name || '').trim().split('.')
  const ext = parts.length > 1 ? String(parts.pop() || '').toLowerCase() : 'pdf'
  if (!/^[a-z0-9]{1,10}$/.test(ext)) return 'pdf'
  return ext
}

function sanitizeIdentifierSegment(value: string) {
  return String(value || '').replace(/[^0-9kK]/g, '').toUpperCase().trim()
}

function buildFinalAttachmentFilename(payload: LeadPayload, originalName: string, leadId: string, createdAt: string) {
  const datePart = (createdAt || new Date().toISOString()).slice(0, 10)
  const namePart = slugifySegment(firstString(payload, 'nombre', 'name') || 'sin-nombre')
  const rutPart = sanitizeIdentifierSegment(firstString(payload, 'rut'))
  const phonePart = sanitizeIdentifierSegment(firstString(payload, 'telefono', 'phone'))
  const leadPart = rutPart || phonePart || String(leadId || '').slice(0, 8) || 'lead'
  const extension = getSafeExtension(originalName)
  return `${datePart}_${namePart}_${leadPart}.${extension}`
}

function buildTempAttachmentPath(originalName: string) {
  const extension = getSafeExtension(originalName)
  return `tmp/${crypto.randomUUID()}.${extension}`
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const payload: Record<string, unknown> = {}
    let file: File | null = null

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (!file && value.size > 0) {
          file = value
        }
        continue
      }

      payload[key] = value
    }

    return { payload, file }
  }

  const payload = await request.json()
  return { payload, file: null }
}

function firstString(payload: LeadPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function normalizeSourceChannel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'pb' || normalized === 'general') return normalized
  return ''
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
  const captureRef = firstString(payload, 'capture_ref', 'ref')
  const pathFromPayload = firstString(payload, 'source_path', 'page_path', 'pathname')
  const sourcePath = pathFromPayload || parsedUrl?.pathname || ''
  const sourceHostname = firstString(payload, 'source_hostname', 'hostname', 'host') || parsedUrl?.hostname || ''

  const inferredChannel =
    explicitChannel ||
    (captureRef ? 'pb' : '') ||
    (sourcePath.startsWith('/pb') ? 'pb' : '') ||
    'general'

  return {
    source_channel: inferredChannel,
    source_form_variant: firstString(payload, 'source_form_variant', 'form_variant') || inferredChannel,
    source_hostname: sourceHostname || (origin ? new URL(origin).hostname : ''),
    source_path: sourcePath,
    source_url: sourceUrl,
  }
}

async function uploadAttachment(file: File): Promise<UploadedAttachment> {
  const tempPath = buildTempAttachmentPath(file.name || 'documento.pdf')
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(tempPath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })

  if (error) throw error

  return {
    tempPath,
    contentType: file.type || 'application/pdf',
    size: file.size || 0,
  }
}

function extractLeadId(data: unknown) {
  if (!data || typeof data !== 'object') return ''
  const leadId = (data as Record<string, unknown>).lead_id
  return typeof leadId === 'string' ? leadId.trim() : ''
}

function extractAppointmentId(data: unknown) {
  if (!data || typeof data !== 'object') return ''
  const appointmentId = (data as Record<string, unknown>).appointment_id
  return typeof appointmentId === 'string' ? appointmentId.trim() : ''
}

async function createGoogleCalendarEventForAppointment(appointmentId: string) {
  if (!appointmentId) return { status: 'skipped' }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-create-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointment_id: appointmentId }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Google Calendar event creation failed'
    console.warn('google-calendar-create-event skipped', { appointmentId, message })
    return { status: 'error', error: message }
  }

  return payload && typeof payload === 'object' ? payload : { status: 'synced' }
}

async function finalizeAttachmentForLead(
  payload: LeadPayload,
  file: File,
  uploaded: UploadedAttachment,
  leadId: string,
) {
  const createdAt = new Date().toISOString()
  const fileName = sanitizeFilename(buildFinalAttachmentFilename(payload, file.name || 'documento.pdf', leadId, createdAt))
  const finalPath = `leads/${fileName}`

  const { error: moveError } = await supabase.storage.from(UPLOAD_BUCKET).move(uploaded.tempPath, finalPath)
  if (moveError) throw moveError

  const { data: leadRow, error: fetchError } = await supabase
    .from('leads')
    .select('metadata')
    .eq('id', leadId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const currentMetadata =
    leadRow?.metadata && typeof leadRow.metadata === 'object' && !Array.isArray(leadRow.metadata)
      ? leadRow.metadata as Record<string, unknown>
      : {}

  const mergedMetadata = {
    ...currentMetadata,
    pdf_path: finalPath,
    pdf_filename: fileName,
    pdf_content_type: uploaded.contentType,
    pdf_size: uploaded.size,
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (updateError) throw updateError

  return { finalPath, fileName }
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

  let uploadedAttachment: UploadedAttachment | null = null
  let createdLeadId = ''
  let finalizedAttachmentPath = ''

  try {
    const { payload, file } = await parsePayload(request)
    const normalizedPayload = typeof payload === 'object' && payload ? { ...(payload as Record<string, unknown>) } : {}
    Object.assign(normalizedPayload, inferSourceContext(normalizedPayload, request))

    if (file) {
      uploadedAttachment = await uploadAttachment(file)
      normalizedPayload.pdf_path = uploadedAttachment.tempPath
      normalizedPayload.pdf_content_type = uploadedAttachment.contentType
      normalizedPayload.pdf_size = uploadedAttachment.size
    }

    const { data, error } = await supabase.rpc('submit_planespro_public_lead', {
      p_payload: normalizedPayload,
    })

    if (error) {
      console.error('submit_planespro_public_lead error', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    createdLeadId = extractLeadId(data)

    if (file && uploadedAttachment && createdLeadId) {
      const finalizedAttachment = await finalizeAttachmentForLead(normalizedPayload, file, uploadedAttachment, createdLeadId)
      finalizedAttachmentPath = finalizedAttachment.finalPath
      if (data && typeof data === 'object') {
        ;(data as Record<string, unknown>).pdf_path = finalizedAttachment.finalPath
        ;(data as Record<string, unknown>).pdf_filename = finalizedAttachment.fileName
      }
    }

    const appointmentId = extractAppointmentId(data)
    const googleCalendarResult = await createGoogleCalendarEventForAppointment(appointmentId)
    if (data && typeof data === 'object' && appointmentId) {
      ;(data as Record<string, unknown>).google_calendar = googleCalendarResult
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('form-leads fatal error', error)

    if (uploadedAttachment?.tempPath) {
      await supabase.storage.from(UPLOAD_BUCKET).remove([uploadedAttachment.tempPath]).catch(() => null)
    }

    if (finalizedAttachmentPath) {
      await supabase.storage.from(UPLOAD_BUCKET).remove([finalizedAttachmentPath]).catch(() => null)
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
