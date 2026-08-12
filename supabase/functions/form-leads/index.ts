import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { resolveUserEmailChannel } from '../_shared/emailChannels.ts'

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
  'http://localhost:8788',
  'http://127.0.0.1:8788',
])

type LeadPayload = Record<string, unknown>

type UploadedAttachment = {
  tempPath: string
  contentType: string
  size: number
}

type NotificationEmailConfig = {
  apiKey: string
  fromEmail: string
  fromName: string
}

type AppointmentNotificationContext = {
  appointmentId: string
  ownerUserId: string
  appointmentAt: string
  timezone: string
  meetLink: string
  googleSyncStatus: string
  sourceChannel: string
  captureRef: string
  captureCampaign: string
  leadName: string
  leadEmail: string
  leadPhone: string
  ownerEmail: string
  ownerName: string
}

type LeadMetadata = Record<string, unknown>

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

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatAppointmentLabel(isoString: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone || 'America/Santiago',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
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

function getLeadMetadataObject(value: unknown): LeadMetadata {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as LeadMetadata
    : {}
}

function buildStep1JourneyMetadata(payload: LeadPayload): LeadMetadata | null {
  const motivo = firstString(payload, 'paso1_motivo')
  const necesidad = firstString(payload, 'paso1_necesidad')
  const objetivo = firstString(payload, 'paso1_objetivo')
  const grupo = firstString(payload, 'paso1_grupo')
  const resumen = firstString(payload, 'paso1_resumen')

  if (!(motivo || necesidad || objetivo || grupo || resumen)) {
    return null
  }

  return {
    version: 'pb-step1-v1',
    motivo,
    necesidad,
    objetivo,
    grupo,
    resumen,
  }
}

function normalizeSourceChannel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'pb' || normalized === 'general') return normalized
  return ''
}

function normalizeCaptureRef(value: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return normalized.slice(0, 64)
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

  const inferredChannel =
    explicitChannel ||
    (captureRef ? 'pb' : '') ||
    (sourcePath.startsWith('/pb') ? 'pb' : '') ||
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

function isFormActionUpdate(payload: LeadPayload) {
  return firstString(payload, 'action_only') === '1'
}

function hasIdempotentFormCredentials(payload: LeadPayload) {
  return Boolean(firstString(payload, 'submission_id') && firstString(payload, 'update_token'))
}

async function submitLeadPayload(payload: LeadPayload) {
  if (isFormActionUpdate(payload)) {
    const leadId = firstString(payload, 'lead_id', 'existing_lead_id')
    const submissionId = firstString(payload, 'submission_id')
    const updateToken = firstString(payload, 'update_token')

    if (!(leadId && submissionId && updateToken)) {
      throw new Error('Missing lead update credentials')
    }

    return supabase.rpc('update_planespro_public_lead_action', {
      p_lead_id: leadId,
      p_submission_id: submissionId,
      p_update_token: updateToken,
      p_payload: payload,
    })
  }

  if (hasIdempotentFormCredentials(payload)) {
    return supabase.rpc('submit_planespro_idempotent_public_lead', {
      p_payload: payload,
    })
  }

  return supabase.rpc('submit_planespro_public_lead', {
    p_payload: payload,
  })
}

async function resolveNotificationEmailConfig(userId: string): Promise<NotificationEmailConfig | null> {
  const channel = await resolveUserEmailChannel(supabase, userId, {
    requestedProvider: 'resend',
    allowSystemFallback: true,
  })

  if (!channel) return null
  if (channel.provider !== 'resend' || channel.credentials.provider !== 'resend') return null

  return {
    apiKey: channel.credentials.apiKey,
    fromEmail: channel.fromEmail,
    fromName: channel.fromName,
  }
}

async function sendResendEmail(
  config: NotificationEmailConfig,
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  })

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'Resend email send failed')
  }
}

async function fetchAppointmentNotificationContext(appointmentId: string): Promise<AppointmentNotificationContext | null> {
  if (!appointmentId) return null

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, user_id, lead_id, start_time, timezone, meet_link, google_sync_status, source_channel, capture_ref, metadata')
    .eq('id', appointmentId)
    .maybeSingle()

  if (appointmentError) throw appointmentError
  if (!appointment?.user_id || !appointment?.lead_id) return null

  const [{ data: lead, error: leadError }, { data: ownerProfile, error: ownerError }] = await Promise.all([
    supabase
      .from('leads')
      .select('name, email, phone')
      .eq('id', appointment.lead_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', appointment.user_id)
      .maybeSingle(),
  ])

  if (leadError) throw leadError
  if (ownerError) throw ownerError

  const metadata =
    appointment.metadata && typeof appointment.metadata === 'object' && !Array.isArray(appointment.metadata)
      ? appointment.metadata as Record<string, unknown>
      : {}

  return {
    appointmentId: String(appointment.id || ''),
    ownerUserId: String(appointment.user_id || ''),
    appointmentAt: String(appointment.start_time || ''),
    timezone: String(appointment.timezone || 'America/Santiago'),
    meetLink: String(appointment.meet_link || ''),
    googleSyncStatus: String(appointment.google_sync_status || ''),
    sourceChannel: String(appointment.source_channel || ''),
    captureRef: String(appointment.capture_ref || ''),
    captureCampaign: String(metadata.capture_campaign || ''),
    leadName: String(lead?.name || '').trim(),
    leadEmail: String(lead?.email || '').trim(),
    leadPhone: String(lead?.phone || '').trim(),
    ownerEmail: String(ownerProfile?.email || '').trim(),
    ownerName: String(ownerProfile?.full_name || ownerProfile?.email || '').trim(),
  }
}

async function sendAppointmentNotifications(appointmentId: string) {
  const context = await fetchAppointmentNotificationContext(appointmentId)
  if (!context) {
    return { status: 'skipped', reason: 'missing_appointment_context' }
  }

  const config = await resolveNotificationEmailConfig(context.ownerUserId)
  if (!config) {
    return { status: 'skipped', reason: 'missing_resend_configuration' }
  }

  const whenLabel = formatAppointmentLabel(context.appointmentAt, context.timezone)
  const meetLine = context.meetLink
    ? `Enlace Meet: ${context.meetLink}`
    : context.googleSyncStatus === 'synced'
      ? 'La cita quedo registrada en Google Calendar.'
      : 'La cita quedo registrada y el enlace Meet sera confirmado por el equipo.'

  const clientResults: string[] = []

  if (context.leadEmail) {
    const clientSubject = `Confirmacion de cita PlanesPro - ${whenLabel}`
    const clientHtml = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
        <h2 style="margin:0 0 12px">Tu cita fue agendada</h2>
        <p>Hola ${escapeHtml(context.leadName || 'cliente')},</p>
        <p>Tu solicitud en PlanesPro quedo registrada para <strong>${escapeHtml(whenLabel)}</strong>.</p>
        <p>Asesor asignado: <strong>${escapeHtml(context.ownerName || 'PlanesPro')}</strong>.</p>
        <p>${escapeHtml(meetLine)}</p>
        <p>Si necesitas reagendar, responde este correo.</p>
      </div>
    `
    const clientText = [
      'Tu cita fue agendada.',
      `Fecha: ${whenLabel}`,
      `Asesor: ${context.ownerName || 'PlanesPro'}`,
      meetLine,
      'Si necesitas reagendar, responde este correo.',
    ].join('\n')

    await sendResendEmail(config, context.leadEmail, clientSubject, clientHtml, clientText)
    clientResults.push('client_sent')
  }

  if (context.ownerEmail) {
    const ownerSubject = `Nueva cita agendada - ${context.leadName || 'Lead'}`
    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
        <h2 style="margin:0 0 12px">Nueva cita agendada</h2>
        <p>Lead: <strong>${escapeHtml(context.leadName || 'Sin nombre')}</strong></p>
        <p>Fecha: <strong>${escapeHtml(whenLabel)}</strong></p>
        <p>Canal: <strong>${escapeHtml(context.sourceChannel || 'general')}</strong></p>
        <p>Telefono: ${escapeHtml(context.leadPhone || '-')}</p>
        <p>Email: ${escapeHtml(context.leadEmail || '-')}</p>
        <p>Capture ref: ${escapeHtml(context.captureRef || '-')}</p>
        <p>Campana: ${escapeHtml(context.captureCampaign || '-')}</p>
        <p>${escapeHtml(meetLine)}</p>
      </div>
    `
    const ownerText = [
      'Nueva cita agendada.',
      `Lead: ${context.leadName || 'Sin nombre'}`,
      `Fecha: ${whenLabel}`,
      `Canal: ${context.sourceChannel || 'general'}`,
      `Telefono: ${context.leadPhone || '-'}`,
      `Email: ${context.leadEmail || '-'}`,
      `Capture ref: ${context.captureRef || '-'}`,
      `Campana: ${context.captureCampaign || '-'}`,
      meetLine,
    ].join('\n')

    await sendResendEmail(config, context.ownerEmail, ownerSubject, ownerHtml, ownerText)
    clientResults.push('owner_sent')
  }

  return {
    status: clientResults.length ? 'sent' : 'skipped',
    deliveries: clientResults,
  }
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

  const currentMetadata = getLeadMetadataObject(leadRow?.metadata)

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

async function mergeLeadMetadataPatch(leadId: string, patch: LeadMetadata) {
  if (!leadId || !Object.keys(patch).length) return

  const { data: leadRow, error: fetchError } = await supabase
    .from('leads')
    .select('metadata')
    .eq('id', leadId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const currentMetadata = getLeadMetadataObject(leadRow?.metadata)
  const mergedMetadata = {
    ...currentMetadata,
    ...patch,
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (updateError) throw updateError
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
    const step1JourneyMetadata = buildStep1JourneyMetadata(normalizedPayload)
    Object.assign(normalizedPayload, inferSourceContext(normalizedPayload, request))

    if (file) {
      uploadedAttachment = await uploadAttachment(file)
      normalizedPayload.pdf_path = uploadedAttachment.tempPath
      normalizedPayload.pdf_content_type = uploadedAttachment.contentType
      normalizedPayload.pdf_size = uploadedAttachment.size
    }

    const actionUpdate = isFormActionUpdate(normalizedPayload)
    const { data, error } = await submitLeadPayload(normalizedPayload)

    if (error) {
      console.error('form lead submit error', {
        action: actionUpdate ? 'update' : 'create',
        code: error.code,
        message: error.message,
      })
      const isConflict = error.code === '23505' || /ya no esta disponible/i.test(error.message || '')
      return new Response(JSON.stringify({ error: error.message }), {
        status: isConflict ? 409 : 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    createdLeadId = extractLeadId(data)

    if (!actionUpdate && createdLeadId && step1JourneyMetadata) {
      await mergeLeadMetadataPatch(createdLeadId, {
        intake_journey: {
          step1: step1JourneyMetadata,
        },
      })
    }

    if (!actionUpdate && file && uploadedAttachment && createdLeadId) {
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
      ;(data as Record<string, unknown>).appointment_notifications = await sendAppointmentNotifications(appointmentId).catch((notificationError) => ({
        status: 'error',
        error: notificationError instanceof Error ? notificationError.message : 'notification_failed',
      }))
    }

    return new Response(JSON.stringify(data), {
      status: actionUpdate ? 200 : 201,
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
