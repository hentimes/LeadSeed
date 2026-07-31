import { useEffect, useMemo, useState } from 'react';
import type {
  EmailTemplate,
  Lead,
  LeadCrossExecEvent,
  LeadList,
  LeadMetadata,
  LeadNote,
  PlanesproLeadMetadata,
  PlanesproLeadRawPayload,
  SendLog,
  WhatsAppTemplate,
  Page,
  AgendaAppointment,
} from '../../types';
import { openWhatsApp } from '../../utils/waHelper';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import { Icon } from '../../utils/icons';
import {
  getAppointmentSuccessMessage,
  getGoogleSyncBadgeLabel,
  getGoogleSyncPendingSummary,
} from '../../utils/appointmentStatusCopy';
import { getCurrentAccessToken, getCurrentSession } from '../../services/authService';
import { createAppointmentFromLead, getDefaultAgendaRange, listMyAppointments } from '../../services/agendaService';
import {
  createLeadNote,
  loadLeadCrossExecAlerts,
  loadLeadDetailData,
  markLeadCrossExecAlertsAsRead,
} from '../../services/leadDetailService';
import { updateLead } from '../../repositories/leadsRepository';

interface Props {
  lead: Lead;
  lists: LeadList[];
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onNavigate?: (page: Page) => void;
}

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

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  lo_antes_posible: 'Lo antes posible',
  agendar_reunion: 'Agendar reunion',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmada',
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  tentativa: 'Tentativa',
  cancelada: 'Cancelada',
  rechazada: 'Rechazada',
  completada: 'Completada',
  no_asistio: 'No asistio',
};

const PLANESPRO_FILE_PROXY_URL =
  import.meta.env.VITE_PLANESPRO_FILE_PROXY_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/form-lead-file`;
const ACTIVE_APPOINTMENT_STATUSES = new Set(['pendiente', 'agendada', 'confirmada', 'tentativa']);

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

function formatAppointmentDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CL');
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

function openMeetLink(meetLink: string): void {
  window.open(meetLink, '_blank', 'noopener,noreferrer');
}

function openAgendaAppointment(appointmentId?: string): void {
  if (!appointmentId) return;
  window.location.hash = `#agenda?appointment=${appointmentId}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

export default function LeadDetail({ lead, lists, onClose, onEdit, onNavigate }: Props) {
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
    (!visibleAppointmentStatus || !ACTIVE_APPOINTMENT_STATUSES.has(visibleAppointmentStatus.toLowerCase()));

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

      // Marcar como leido si aun no lo esta
      if (metadata.is_read !== true) {
        try {
          const updatedMetadata = { ...metadata, is_read: true };
          await updateLead(leadId, { metadata: updatedMetadata });
          // No necesitamos actualizar el estado local 'lead' ya que cerraremos el modal o no es visible
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
          prev.map((event) => unreadIds.includes(event.id) ? { ...event, isRead: true } : event),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => {
    if (planesproMetadata.pdf_path) {
      setPdfError('');
      setPdfLoading(false);
    } else {
      setPdfError('');
      setPdfLoading(false);
    }
  }, [planesproMetadata.pdf_path]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!leadId) return;
      const range = getDefaultAgendaRange(90);
      const appointments = await listMyAppointments(range.from, range.to);
      if (cancelled) return;
      const appointment = appointments.find(
        (item) => item.leadId === leadId && ACTIVE_APPOINTMENT_STATUSES.has(item.status),
      );
      setActiveAppointment(appointment || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

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

    const targetName = `planespro-pdf-${leadId || 'lead'}-${download ? 'download' : 'view'}`
    const openedWindow = window.open('', targetName);
    if (!openedWindow) {
      setPdfLoading(false);
      setPdfError('El navegador bloqueo la ventana del PDF.');
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = PLANESPRO_FILE_PROXY_URL;
    form.target = targetName;
    form.style.display = 'none';

    const appendField = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    appendField('access_token', accessToken);
    appendField('path', pdfPath);
    appendField('download', download ? '1' : '0');

    document.body.appendChild(form);
    form.submit();
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

  const getTemplateName = (templateId: number, type: string) => {
    if (type === 'whatsapp') return waTemplates.find((template) => template.id === templateId)?.nombre || '?';
    return emailTemplates.find((template) => template.id === templateId)?.nombre || '?';
  };

  const leadLists = lists.filter((list) => lead.listaIds?.includes(list.id!));

  const STEP1_MOTIVO_LABELS: Record<string, string> = {
    'invertir': 'Invertir',
    'vivir': 'Vivir'
  };

  const STEP1_NECESIDAD_LABELS: Record<string, string> = {
    'rentabilidad': 'Rentabilidad',
    'patrimonio': 'Patrimonio',
    'seguridad': 'Seguridad',
    'independencia': 'Independencia'
  };

  const STEP1_OBJETIVO_LABELS: Record<string, string> = {
    'corto_plazo': 'Corto plazo',
    'largo_plazo': 'Largo plazo',
    'jubilacion': 'Jubilación'
  };

  const toJourneyLabel = (val: string, labels: Record<string, string>) => labels[val] || val;
  
  const journey = (planesproMetadata as any)?.intake_journey?.step1 || (() => {
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Iconos inline
  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );

  const WAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-8 p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-[460px] flex flex-col mx-auto animate-scale-in border border-slate-100 mb-8 relative">
        
        {/* Header (Sin tag nuevo, rut visible, nombre en una linea) */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-100 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-[#F2EEFF] to-[#E0D4FF] text-[#6C4CF6] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate w-full" title={lead.name}>{lead.name}</h2>
              {/* Rut si existe */}
              {!!((lead as any).documentId || rawPayload.rut || rawPayload.document_id) && (
                <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                  RUT: {(lead as any).documentId || rawPayload.rut || rawPayload.document_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onEdit(lead); onClose(); }} className="p-1.5 text-slate-400 hover:text-[#6C4CF6] hover:bg-[#F2EEFF] rounded-[6px] transition-colors" title="Editar">
              {Icon.Edit()}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors" title="Cerrar">
              {Icon.Close()}
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pt-3 space-y-4">
          
          {/* Quick Actions / Contacto (En una sola linea) */}
          <div className="flex gap-2 w-full">
            {/* Phone Block */}
            {lead.phone && (
              <div className="flex-1 flex gap-1 min-w-0">
                <div 
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] cursor-pointer hover:bg-slate-100 transition-colors group min-w-0"
                  title="Doble clic para copiar"
                  onDoubleClick={() => copyToClipboard(lead.phone)}
                >
                  <span className="text-slate-400 shrink-0">{Icon.Phone()}</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{lead.phone}</span>
                  <span className="ml-auto text-slate-300 group-hover:text-slate-500 shrink-0"><CopyIcon /></span>
                </div>
                <button onClick={() => openWhatsApp(lead.phone, '')} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="WhatsApp">
                  <WAppIcon />
                </button>
                <a href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="Llamar">
                  {Icon.Phone()}
                </a>
              </div>
            )}
            {/* Email Block */}
            {lead.email && (
              <div className="flex-1 flex gap-1 min-w-0">
                <div 
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] cursor-pointer hover:bg-slate-100 transition-colors group min-w-0"
                  title="Doble clic para copiar"
                  onDoubleClick={() => copyToClipboard(lead.email)}
                >
                  <span className="text-slate-400 shrink-0">{Icon.Email()}</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{lead.email}</span>
                  <span className="ml-auto text-slate-300 group-hover:text-slate-500 shrink-0"><CopyIcon /></span>
                </div>
                <a href={`mailto:${lead.email}`} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="Enviar correo">
                  {Icon.Email()}
                </a>
              </div>
            )}
          </div>

          {/* Journey Section (Resumen siempre visible) */}
          {!!(isPlanesproLead || journey) && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revisión PlanesPro</h3>
              
              {!!journey && (
                <div className="bg-slate-50 rounded-[8px] p-3 border border-slate-200 mb-3">
                  
                  {!!journey.resumen && (
                    <div className="bg-[#F2EEFF] rounded-[6px] p-3 border border-[#E0D4FF] mb-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[#6C4CF6]">
                        {Icon.CheckCircle()}
                        <span className="font-bold text-[11px] uppercase tracking-wide">Resumen</span>
                      </div>
                      <p className="text-[12px] text-[#5b3ce0] font-medium leading-relaxed">
                        {`${journey.resumen || ''}`}
                      </p>
                    </div>
                  )}

                  <details className="group">
                    <summary className="text-[11px] font-bold text-[#6C4CF6] cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">{Icon.ChevronRight()}</span> Ver respuestas originales
                    </summary>
                    <div className="mt-3 flex gap-2 w-full">
                      {!!journey.motivo && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">Motivo</p>
                          <p className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2" title={toJourneyLabel(`${journey.motivo || ''}`, STEP1_MOTIVO_LABELS)}>{toJourneyLabel(`${journey.motivo || ''}`, STEP1_MOTIVO_LABELS)}</p>
                        </div>
                      )}
                      
                      {!!journey.necesidad && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">Necesidad</p>
                          <p className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2" title={toJourneyLabel(`${journey.necesidad || ''}`, STEP1_NECESIDAD_LABELS)}>{toJourneyLabel(`${journey.necesidad || ''}`, STEP1_NECESIDAD_LABELS)}</p>
                        </div>
                      )}

                      {!!journey.objetivo && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">Objetivo</p>
                          <p className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2" title={toJourneyLabel(`${journey.objetivo || ''}`, STEP1_OBJETIVO_LABELS)}>{toJourneyLabel(`${journey.objetivo || ''}`, STEP1_OBJETIVO_LABELS)}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Datos del Lead (Desplegable con Grid Completo) */}
          <details className="group bg-slate-50 border border-slate-200 rounded-[8px] overflow-hidden" open>
            <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:bg-slate-100 p-3 list-none flex items-center justify-between select-none transition-colors">
              <div className="flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform text-[#6C4CF6]">{Icon.ChevronRight()}</span> 
                Detalles y Perfil
              </div>
              <span className="text-[11px] font-semibold text-slate-400 tracking-normal normal-case">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</span>
            </summary>
            
            <div className="p-3 pt-0 border-t border-slate-100 mt-1">
              <div className="grid grid-cols-2 gap-2 mt-2">

                {/* Origen */}
                {!!((lead as any).source || rawPayload.origen || rawPayload.source) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Origen</p>
                    <p className="text-[12px] font-semibold text-slate-700 truncate">{`${(lead as any).source || rawPayload.origen || rawPayload.source || ''}`}</p>
                  </div>
                )}

                {!!planesproDetails.rangoEdad && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Edad</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.rangoEdad}</p>
                  </div>
                )}
                
                {!!(planesproDetails.rangoRenta || rawPayload.renta || rawPayload.renta_liquida) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Renta</p>
                    <p className="text-[12px] font-semibold text-slate-700">{`${planesproDetails.rangoRenta || toReadableValue(rawPayload.renta) || toReadableValue(rawPayload.renta_liquida) || ''}`}</p>
                  </div>
                )}
                
                {/* Lógica Fonasa/Isapre */}
                {!!(planesproDetails.sistema && String(planesproDetails.sistema).toLowerCase() === 'fonasa') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sistema</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.sistema}</p>
                  </div>
                )}
                {!!planesproDetails.isapre && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Isapre</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.isapre}</p>
                  </div>
                )}

                {!!planesproDetails.comuna && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Comuna</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.comuna}</p>
                  </div>
                )}
                {!!planesproDetails.region && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Región</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.region}</p>
                  </div>
                )}

                {/* Cargas (en el grid si aplica) */}
                {!!(planesproDetails.numeroCargas && planesproDetails.numeroCargas !== '0') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-[#6C4CF6] font-bold uppercase tracking-wide">Cargas Familiares</p>
                      <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.numeroCargas} carga(s)</p>
                    </div>
                    {!!(planesproDetails.edadesCargas && planesproDetails.edadesCargas.length > 0) && (
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Edades</p>
                        <p className="text-[11px] font-semibold text-slate-600">{planesproDetails.edadesCargas.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* Mensaje / Comentario del cliente */}
          {!!planesproDetails.comentario && (
            <div className="mt-2 bg-[#F2EEFF] p-3 rounded-[6px] border border-[#E0D4FF]">
              <p className="text-[10px] text-[#6C4CF6] font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                {Icon.Messages()} Comentario del cliente
              </p>
              <p className="text-[12px] text-slate-800 font-medium whitespace-pre-wrap">{planesproDetails.comentario}</p>
            </div>
          )}
          
          {/* PDF Adjunto si existe */}
          {!!(planesproMetadata.pdf_path || pdfLoading || pdfError) && (
            <div className="mt-2 bg-slate-50 p-3 rounded-[6px] border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-[#6C4CF6]">{Icon.Layers()}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide">Documento PDF</p>
                  <p className="text-[10px] text-slate-500">{pdfFileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {planesproMetadata.pdf_path ? (
                  <>
                    <button onClick={() => { void submitPdfRequest(false); }} className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors">
                      Ver
                    </button>
                    <button onClick={() => { void submitPdfRequest(true); }} className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors">
                      Descargar
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">{pdfLoading ? 'Cargando...' : pdfError || 'Sin acceso'}</span>
                )}
              </div>
            </div>
          )}

          {/* Agenda Compacta */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cita / Agenda</h3>
            {!canCreateAppointment ? (
              <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-2.5 flex justify-between items-center">
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{`${visibleAppointmentStatus || ''}`}</p>
                  <p className="text-[12px] font-semibold text-slate-800">{formatAppointmentDate(`${visibleAppointmentAt || ''}`)}</p>
                </div>
                {onNavigate && (
                  <button onClick={() => { openAgendaAppointment(activeAppointment?.id); onClose(); onNavigate('agenda'); }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-[4px] text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
                    Ver cita
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[6px] p-2.5 shadow-sm space-y-2">
                <div className="flex gap-2">
                  <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={appointmentNote} onChange={(e) => setAppointmentNote(e.target.value)} placeholder="Nota (opcional)" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <button onClick={() => { void handleCreateAppointment(); }} disabled={appointmentLoading} className="px-3 py-1.5 bg-[#161A24] hover:bg-black text-white text-[11px] font-bold rounded-[4px] transition-colors disabled:opacity-60">
                    {appointmentLoading ? '...' : 'Agendar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Contacto y Notas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Interacciones</h3>
              <button onClick={() => setShowNotes(!showNotes)} className="text-[10px] font-bold text-[#6C4CF6] hover:underline bg-[#F2EEFF] px-2 py-0.5 rounded-[4px]">
                {showNotes ? 'Ocultar' : `Ver historial (${notes.length})`}
              </button>
            </div>
            
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Registrar interacción (ej. Se llamó y no contestó)..." 
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:bg-white transition-colors" 
              />
              <button onClick={addNote} className="px-3 py-1.5 bg-[#F2EEFF] text-[#6C4CF6] text-[12px] font-bold rounded-[6px] hover:bg-[#E0D4FF] transition-colors" title="Guardar">
                {Icon.Send()}
              </button>
            </div>

            {showNotes && (
              <div className="space-y-2 mt-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-[6px] p-2.5 border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Nota interna</span>
                      <span className="text-[9px] text-slate-400 font-medium">{new Date(note.createdAt).toLocaleString('es-CL')}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-center py-2 text-[11px] text-slate-400 italic">No hay interacciones registradas.</div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
