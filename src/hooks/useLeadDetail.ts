import { useEffect, useMemo, useState } from 'react';
import type {
  AgendaAppointment,
  EmailTemplate,
  Lead,
  LeadCrossExecEvent,
  LeadMetadata,
  LeadNote,
  PlanesproLeadMetadata,
  PlanesproLeadRawPayload,
  SendLog,
  WhatsAppTemplate,
} from '../types';
import {
  getAppointmentSuccessMessage,
  getGoogleSyncBadgeLabel,
  getGoogleSyncPendingSummary,
} from '../utils/appointmentStatusCopy';
import { getCurrentAccessToken, getCurrentSession } from '../services/authService';
import { createAppointmentFromLead, getDefaultAgendaRange, listMyAppointments } from '../services/agendaService';
import {
  createLeadNote,
  loadLeadCrossExecAlerts,
  loadLeadDetailData,
  markLeadCrossExecAlertsAsRead,
} from '../services/leadDetailService';
import { markLeadAsRead } from '../services/leadsService';
import { isActiveAppointment } from '../utils/appointmentStatus';
import { getErrorMessage } from '../utils/errorMessage';
import { getPlatform } from '../platform/registry';

const TECHNICAL_METADATA_KEYS = new Set([
  'raw_payload',
  'source_system',
  'source_channel',
  'source_form_variant',
  'source_hostname',
  'source_path',
  'source_url',
  'source_cta',
  'fuente_cta',
  'capture_ref',
  'first_touch_ref',
  'capture_link_id',
  'capture_link_name',
  'capture_campaign',
  'pdf_path',
  'pdf_filename',
  'pdf_content_type',
  'pdf_size',
  'appointment_status',
  'appointment_id',
  'contact_preference',
  'advisor_id',
]);

const STEP1_MOTIVO_LABELS: Record<string, string> = {
  invertir: 'Invertir',
  vivir: 'Vivir',
};

const STEP1_NECESIDAD_LABELS: Record<string, string> = {
  rentabilidad: 'Rentabilidad',
  patrimonio: 'Patrimonio',
  seguridad: 'Seguridad',
  independencia: 'Independencia',
};

const STEP1_OBJETIVO_LABELS: Record<string, string> = {
  corto_plazo: 'Corto plazo',
  largo_plazo: 'Largo plazo',
  jubilacion: 'Jubilación',
};

const PLANESPRO_FILE_PROXY_URL =
  import.meta.env.VITE_PLANESPRO_FILE_PROXY_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/form-lead-file`;

function toReadableValue(value: unknown) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value).trim();
}

function parseCargaAges(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // no-op
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function todayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoLocal(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function toJourneyLabel(val: string, labels: Record<string, string>) {
  return labels[val] || val;
}

export function useLeadDetail(lead: Lead) {
  const metadata = (lead.metadata || {}) as LeadMetadata;
  const leadId = lead.id ?? '';
  const planesproMetadata = metadata as PlanesproLeadMetadata;
  const rawPayload = (planesproMetadata.raw_payload || {}) as PlanesproLeadRawPayload;

  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [crossExecAlerts, setCrossExecAlerts] = useState<LeadCrossExecEvent[]>(lead.crossExecAlerts || []);
  const [newNote, setNewNote] = useState('');
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(todayDate());
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [appointmentMessage, setAppointmentMessage] = useState('');
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<AgendaAppointment | null>(null);
  const [localAppointmentAt, setLocalAppointmentAt] = useState<string | undefined>(lead.scheduledAt);
  const [localAppointmentStatus, setLocalAppointmentStatus] = useState<string | undefined>(
    typeof planesproMetadata.appointment_status === 'string' ? planesproMetadata.appointment_status : undefined,
  );

  const isPlanesproLead = planesproMetadata.source_system === 'planespro';
  const pdfFileName =
    typeof planesproMetadata.pdf_filename === 'string' && planesproMetadata.pdf_filename.trim()
      ? planesproMetadata.pdf_filename.trim()
      : 'adjunto.pdf';
  const hasMeaningfulUpdate =
    !!lead.updatedAt &&
    !!lead.createdAt &&
    Math.abs(new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime()) > 60_000;

  const planesproDetails = useMemo(() => {
    const comentario = lead.notes || toReadableValue(rawPayload.comentarios || rawPayload.comentario);

    return {
      sistema: toReadableValue(rawPayload.sistema_actual),
      isapre: toReadableValue(rawPayload.isapre_especifica),
      rangoRenta: toReadableValue(rawPayload.rango_renta),
      rangoEdad: toReadableValue(rawPayload.rango_edad),
      comuna: toReadableValue(rawPayload.comuna),
      region: toReadableValue(rawPayload.region),
      numeroCargas: toReadableValue(rawPayload.numero_cargas),
      edadesCargas: parseCargaAges(rawPayload.edad_cargas),
      contacto: toReadableValue(planesproMetadata.contact_preference || rawPayload.contacto_preferencia),
      appointmentStatus: toReadableValue(planesproMetadata.appointment_status || rawPayload.cita_estado),
      appointmentAt: toReadableValue(lead.scheduledAt || rawPayload.cita_fecha_hora),
      comentario,
    };
  }, [lead.notes, lead.scheduledAt, planesproMetadata.appointment_status, planesproMetadata.contact_preference, rawPayload]);

  const visibleAppointmentStatus = activeAppointment?.status || localAppointmentStatus || planesproDetails.appointmentStatus;
  const visibleAppointmentAt = activeAppointment?.startsAt || localAppointmentAt || planesproDetails.appointmentAt;
  const visibleMeetLink = activeAppointment?.meetLink;
  const googleSyncBadgeLabel = getGoogleSyncBadgeLabel(activeAppointment);
  const googlePendingSummary = getGoogleSyncPendingSummary(activeAppointment);
  const canCreateAppointment =
    !!leadId &&
    (!visibleAppointmentStatus || !isActiveAppointment(visibleAppointmentStatus));

  const genericMetadataEntries = useMemo(
    () =>
      Object.entries(metadata).filter(([key, value]) => {
        if (TECHNICAL_METADATA_KEYS.has(key)) return false;
        if (value == null) return false;
        if (typeof value === 'string' && !value.trim()) return false;
        if (typeof value === 'object') return false;
        return true;
      }),
    [metadata],
  );

  const getCrossExecMessage = (event: LeadCrossExecEvent) => {
    const dateText = new Date(event.counterpartCapturedAt).toLocaleString('es-CL');
    if (event.eventKind === 'captured_previously') {
      return `Lead captado previamente por otro ejecutivo el ${dateText}`;
    }
    return `Este cliente contacto a otro ejecutivo el ${dateText}`;
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!leadId) return;
      const data = await loadLeadDetailData(leadId);
      if (cancelled) return;
      setNotes(data.notes);
      setSendLogs(data.sendLogs);
      setWaTemplates(data.waTemplates);
      setEmailTemplates(data.emailTemplates);

      if (metadata.is_read !== true) {
        try {
          await markLeadAsRead(leadId, metadata);
        } catch (e) {
          console.error('Error marcando lead como leido:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, metadata]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!leadId) return;
      const alerts = await loadLeadCrossExecAlerts(leadId);
      if (cancelled) return;
      setCrossExecAlerts(alerts);

      const unreadIds = alerts.filter((event) => !event.isRead).map((event) => event.id);
      if (unreadIds.length > 0) {
        await markLeadCrossExecAlertsAsRead(unreadIds);
        if (cancelled) return;

        setCrossExecAlerts((prev) =>
          prev.map((event) => (unreadIds.includes(event.id) ? { ...event, isRead: true } : event)),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => {
    setPdfError('');
    setPdfLoading(false);
  }, [planesproMetadata.pdf_path]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!leadId) return;
      const range = getDefaultAgendaRange(90);
      const appointments = await listMyAppointments(range.from, range.to);
      if (cancelled) return;
      const appointment = appointments.find(
        (item) => item.leadId === leadId && isActiveAppointment(item.status),
      );
      setActiveAppointment(appointment || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => {
    const { scrollLock } = getPlatform();

    scrollLock.lock();
    return () => scrollLock.unlock();
  }, []);

  const submitPdfRequest = async (download: boolean) => {
    const pdfPath = typeof planesproMetadata.pdf_path === 'string' ? planesproMetadata.pdf_path.trim() : '';
    if (!pdfPath) {
      setPdfError('No hay un PDF asociado a este lead.');
      return;
    }

    setPdfLoading(true);
    setPdfError('');

    const accessToken = await getCurrentAccessToken();

    if (!accessToken) {
      setPdfLoading(false);
      setPdfError('Debes iniciar sesion para abrir el PDF.');
      return;
    }

    const targetName = `planespro-pdf-${leadId || 'lead'}-${download ? 'download' : 'view'}`;
    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    const openedWindow = window.open('', targetName);
    if (!openedWindow) {
      setPdfLoading(false);
      setPdfError('El navegador bloqueo la ventana del PDF.');
      return;
    }

    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = PLANESPRO_FILE_PROXY_URL;
    form.target = targetName;
    form.style.display = 'none';

    const appendField = (name: string, value: string) => {
      // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    appendField('access_token', accessToken);
    appendField('path', pdfPath);
    appendField('download', download ? '1' : '0');

    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    document.body.appendChild(form);
    form.submit();
    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    document.body.removeChild(form);
    setPdfLoading(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    const session = await getCurrentSession();
    const userId = session?.user?.id;
    if (!userId) return;

    if (!leadId) return;
    const updatedNotes = await createLeadNote(leadId, userId, newNote);

    setNewNote('');
    setNotes(updatedNotes);
  };

  const handleCreateAppointment = async () => {
    if (!leadId) return;

    if (!appointmentDate || !appointmentTime) {
      setAppointmentError('Completa fecha y hora para agendar');
      return;
    }

    const startsAt = toIsoLocal(appointmentDate, appointmentTime);
    if (new Date(startsAt) <= new Date()) {
      setAppointmentError('La cita debe ser futura');
      return;
    }

    setAppointmentLoading(true);
    setAppointmentMessage('');
    setAppointmentError('');
    try {
      const result = await createAppointmentFromLead({
        leadId,
        startsAt,
        note: appointmentNote,
      });

      setLocalAppointmentAt(result.appointment.startsAt);
      setLocalAppointmentStatus(result.appointment.status);
      setActiveAppointment(result.appointment);
      setAppointmentNote('');
      setAppointmentMessage(getAppointmentSuccessMessage('create', result.googleSyncStatus));
    } catch (err) {
      setAppointmentError(getErrorMessage(err, 'No se pudo crear la cita'));
    } finally {
      setAppointmentLoading(false);
    }
  };

  const getTemplateName = (templateId: string | number, type: string) => {
    if (type === 'whatsapp') return waTemplates.find((template) => template.id === templateId)?.nombre || '?';
    return emailTemplates.find((template) => template.id === templateId)?.nombre || '?';
  };

  const getTemplateContent = (log: SendLog) => {
    if (log.templateType === 'whatsapp') {
      return waTemplates.find((template) => template.id === log.templateId)?.contenido || '';
    }
    const emailTemplate = emailTemplates.find((template) => template.id === log.templateId);
    return emailTemplate?.contenido || '';
  };

  const isEmailTemplateHtml = (log: SendLog) => {
    if (log.templateType !== 'email') return false;
    return !!emailTemplates.find((template) => template.id === log.templateId)?.isHtml;
  };

  const journey =
    (planesproMetadata as unknown as { intake_journey?: { step1?: Record<string, unknown> } })?.intake_journey
      ?.step1 ||
    (() => {
      const rp = rawPayload as Record<string, unknown>;
      const motivo = rp.paso1_motivo as string | undefined;
      const necesidad = rp.paso1_necesidad as string | undefined;
      const objetivo = rp.paso1_objetivo as string | undefined;
      const resumen = rp.paso1_resumen as string | undefined;
      if (motivo || necesidad || objetivo || resumen) {
        return { motivo, necesidad, objetivo, resumen };
      }
      return undefined;
    })();

  return {
    leadId,
    metadata,
    planesproMetadata,
    rawPayload,
    isPlanesproLead,
    pdfFileName,
    hasMeaningfulUpdate,
    planesproDetails,
    genericMetadataEntries,
    journey,
    journeyLabels: {
      motivo: STEP1_MOTIVO_LABELS,
      necesidad: STEP1_NECESIDAD_LABELS,
      objetivo: STEP1_OBJETIVO_LABELS,
    },

    notes,
    newNote,
    setNewNote,
    addNote,
    showNotes,
    setShowNotes,

    sendLogs,
    showLogs,
    setShowLogs,
    expandedLogId,
    setExpandedLogId,
    getTemplateName,
    getTemplateContent,
    isEmailTemplateHtml,

    crossExecAlerts,
    getCrossExecMessage,

    pdfError,
    pdfLoading,
    submitPdfRequest,

    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    appointmentNote,
    setAppointmentNote,
    appointmentMessage,
    appointmentError,
    appointmentLoading,
    canCreateAppointment,
    handleCreateAppointment,
    visibleAppointmentStatus,
    visibleAppointmentAt,
    visibleMeetLink,
    googleSyncBadgeLabel,
    googlePendingSummary,
    activeAppointment,
  };
}

export type UseLeadDetailResult = ReturnType<typeof useLeadDetail>;
