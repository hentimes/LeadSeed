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
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

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

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-900 rounded-lg shadow-xl w-[92%] max-w-[340px] max-h-[90vh] flex flex-col mx-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold">{lead.name}</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
              style={{ backgroundColor: STATUS_COLORS[lead.status || 'nuevo'] }}
            >
              {STATUS_LABELS[lead.status || 'nuevo']}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const text = [
                  `Nombre: ${lead.name}`,
                  lead.phone ? `Telefono: ${lead.phone}` : '',
                  lead.email ? `Email: ${lead.email}` : '',
                  lead.company ? `Empresa: ${lead.company}` : '',
                  lead.rut ? `RUT: ${lead.rut}` : '',
                ].filter(Boolean).join('\n');

                navigator.clipboard.writeText(text);
                const button = document.getElementById('copy-btn');
                if (button) {
                  const previous = button.innerHTML;
                  button.innerHTML = 'Copiado';
                  setTimeout(() => {
                    button.innerHTML = previous;
                  }, 2000);
                }
              }}
              id="copy-btn"
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 text-sm flex items-center gap-1"
            >
              <Icon.Copy /> Copiar
            </button>
            <button onClick={() => { onEdit(lead); onClose(); }} className="text-blue-600 hover:text-blue-800 text-sm">
              {Icon.Edit()} Editar
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-slate-500 dark:text-slate-400 text-lg leading-none ml-2">
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {crossExecAlerts.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/90 rounded-md p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 mb-2">
                {Icon.Warning()}
                Seguimiento comercial
              </div>
              <div className="space-y-1.5">
                {crossExecAlerts.map((event) => (
                  <div key={event.id} className="text-[11px] text-amber-900 leading-4">
                    {getCrossExecMessage(event)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.phone && <div><span className="text-slate-400 dark:text-slate-500 text-xs">Telefono</span><p>{lead.phone}</p></div>}
            {lead.email && <div><span className="text-slate-400 dark:text-slate-500 text-xs">Email</span><p className="text-blue-600">{lead.email}</p></div>}
            {lead.company && <div><span className="text-slate-400 dark:text-slate-500 text-xs">Empresa</span><p>{lead.company}</p></div>}
            {lead.rut && <div><span className="text-slate-400 dark:text-slate-500 text-xs">RUT</span><p className="font-mono">{lead.rut}</p></div>}
            <div><span className="text-slate-400 dark:text-slate-500 text-xs">Ingreso</span><p>{new Date(lead.createdAt).toLocaleDateString('es-CL')}</p></div>
            {hasMeaningfulUpdate && <div><span className="text-slate-400 dark:text-slate-500 text-xs">Actualizado</span><p>{new Date(lead.updatedAt).toLocaleDateString('es-CL')}</p></div>}
          </div>

          {isPlanesproLead && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Formulario PlanesPro</p>
              <div className="bg-blue-50/50 rounded-md p-2 space-y-2 border border-blue-100">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {planesproDetails.sistema && (
                    <div>
                      <span className="text-blue-700/80">Sistema</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.sistema}</p>
                    </div>
                  )}
                  {planesproDetails.isapre && (
                    <div>
                      <span className="text-blue-700/80">Isapre</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.isapre}</p>
                    </div>
                  )}
                  {planesproDetails.rangoEdad && (
                    <div>
                      <span className="text-blue-700/80">Edad</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.rangoEdad}</p>
                    </div>
                  )}
                  {planesproDetails.rangoRenta && (
                    <div>
                      <span className="text-blue-700/80">Renta</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.rangoRenta}</p>
                    </div>
                  )}
                  {planesproDetails.comuna && (
                    <div>
                      <span className="text-blue-700/80">Comuna</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.comuna}</p>
                    </div>
                  )}
                  {planesproDetails.region && (
                    <div>
                      <span className="text-blue-700/80">Region</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.region}</p>
                    </div>
                  )}
                  {planesproDetails.numeroCargas && (
                    <div>
                      <span className="text-blue-700/80">Cargas</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.numeroCargas}</p>
                    </div>
                  )}
                  {planesproDetails.edadesCargas.length > 0 && (
                    <div>
                      <span className="text-blue-700/80">Edades cargas</span>
                      <p className="font-semibold text-slate-800">{planesproDetails.edadesCargas.join(', ')}</p>
                    </div>
                  )}
                  {planesproDetails.contacto && (
                    <div>
                      <span className="text-blue-700/80">Contacto</span>
                      <p className="font-semibold text-slate-800">
                        {CONTACT_PREFERENCE_LABELS[planesproDetails.contacto] || planesproDetails.contacto}
                      </p>
                    </div>
                  )}
                  {visibleAppointmentStatus && (
                    <div>
                      <span className="text-blue-700/80">Estado cita</span>
                      <p className="font-semibold text-slate-800">
                        {APPOINTMENT_STATUS_LABELS[visibleAppointmentStatus.toLowerCase()] || visibleAppointmentStatus}
                      </p>
                    </div>
                  )}
                  {visibleAppointmentAt && (
                    <div className="col-span-2">
                      <span className="text-blue-700/80">Fecha cita</span>
                      <p className="font-semibold text-slate-800">{formatAppointmentDate(visibleAppointmentAt)}</p>
                    </div>
                  )}
                  {activeAppointment && googleSyncBadgeLabel && (
                    <div className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                      <span className="text-amber-800">{googleSyncBadgeLabel}</span>
                      <p className="mt-1 text-slate-700">{googlePendingSummary}</p>
                    </div>
                  )}
                </div>
                {(planesproMetadata.pdf_path || pdfLoading || pdfError) && (
                  <div className="rounded-md bg-white/80 p-2 text-xs">
                    <span className="text-blue-700/80">Adjunto PDF</span>
                    <div className="mt-1 flex items-center gap-2">
                      {planesproMetadata.pdf_path ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { void submitPdfRequest(false); }}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            {Icon.View()} Ver PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => { void submitPdfRequest(true); }}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            {Icon.Download()} Descargar
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-500">
                          {pdfLoading ? 'Preparando vista...' : pdfError || 'Sin acceso al PDF'}
                        </span>
                      )}
                    </div>
                    {planesproMetadata.pdf_filename && (
                      <p className="mt-2 break-all text-slate-500">{planesproMetadata.pdf_filename}</p>
                    )}
                  </div>
                )}
                {planesproDetails.comentario && (
                  <div className="rounded-md bg-white/80 p-2 text-xs">
                    <span className="text-blue-700/80">Comentario</span>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {planesproDetails.comentario}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Agenda</p>
            <div className="border-l-2 border-blue-500 bg-slate-50/80 p-2 text-xs space-y-2">
              {!canCreateAppointment && (
                <div className="space-y-2">
                  <p className="text-slate-600">
                    Este lead ya tiene una cita activa.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleMeetLink && (
                      <button
                        type="button"
                        onClick={() => openMeetLink(visibleMeetLink)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Abrir Meet
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          openAgendaAppointment(activeAppointment?.id);
                          onClose();
                          onNavigate('agenda');
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Gestionar cita
                      </button>
                    )}
                  </div>
                </div>
              )}
              {canCreateAppointment && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(event) => setAppointmentDate(event.target.value)}
                      className="border rounded px-2 py-1.5 bg-white"
                    />
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(event) => setAppointmentTime(event.target.value)}
                      className="border rounded px-2 py-1.5 bg-white"
                    />
                  </div>
                  <textarea
                    value={appointmentNote}
                    onChange={(event) => setAppointmentNote(event.target.value)}
                    placeholder="Nota de la cita..."
                    className="w-full border rounded px-2 py-1.5 bg-white min-h-[54px] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => { void handleCreateAppointment(); }}
                    disabled={appointmentLoading}
                    className="w-full bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {appointmentLoading ? 'Agendando...' : 'Agendar cita'}
                  </button>
                </>
              )}
              {appointmentMessage && <p className="text-[11px] text-emerald-700">{appointmentMessage}</p>}
              {appointmentError && <p className="text-[11px] text-red-600">{appointmentError}</p>}
            </div>
          </div>

          {genericMetadataEntries.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Informacion adicional</p>
              <div className="bg-blue-50/50 rounded-md p-2 space-y-1.5 border border-blue-100">
                {genericMetadataEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-blue-100/50 last:border-0 pb-1 last:pb-0 gap-2">
                    <span className="text-xs font-medium text-blue-800 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-blue-900 font-semibold text-right break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lead.notes && !isPlanesproLead && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Notas actuales</p>
              <p className="text-sm bg-slate-50 dark:bg-slate-900 rounded p-2 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {leadLists.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Listas</p>
              <div className="flex flex-wrap gap-1">
                {leadLists.map((list) => (
                  <span key={list.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: list.color }}>
                    {list.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              placeholder="Agregar nota..."
              className="flex-1 border rounded px-2 py-1.5 text-xs"
              onKeyDown={(event) => event.key === 'Enter' && addNote()}
            />
            <button onClick={addNote} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700">
              Guardar
            </button>
          </div>

          <div>
            <button onClick={() => setShowNotes(!showNotes)} className="w-full flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 border-b pb-1 hover:text-blue-600">
              <span>Historial de notas ({notes.length + (lead.notes ? 1 : 0)})</span>
              <span>{showNotes ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
            </button>
            {showNotes && (
              <>
                {notes.length === 0 && !lead.notes && (
                  <p className="text-xs text-gray-400">Sin notas todavia.</p>
                )}
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-blue-300 pl-3">
                      <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(note.createdAt).toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {sendLogs.length > 0 && (
            <div>
              <button onClick={() => setShowLogs(!showLogs)} className="w-full flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 border-b pb-1 hover:text-blue-600">
                <span>Historial de envios ({sendLogs.length})</span>
                <span>{showLogs ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
              </button>
              {showLogs && (
                <div className="space-y-1">
                  {sendLogs.map((log) => {
                    const templateName = getTemplateName(log.templateId as any, log.templateType);
                    const hasContent = templateName !== '?';
                    const isExpanded = expandedLogId === log.id;

                    let templateContent = '';
                    if (log.templateType === 'whatsapp') {
                      templateContent = waTemplates.find((template) => template.id === log.templateId)?.contenido || '';
                    } else {
                      const emailTemplate = emailTemplates.find((template) => template.id === log.templateId);
                      templateContent = emailTemplate?.contenido || '';
                    }

                    return (
                      <div key={log.id}>
                        <div className="text-xs flex items-center gap-2">
                          <span className={log.templateType === 'whatsapp' ? 'text-green-600' : 'text-blue-600'}>
                            {log.templateType === 'whatsapp'
                              ? <span className="text-green-500">{Icon.Send()}</span>
                              : <span className="text-blue-500">{Icon.Email()}</span>}
                          </span>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id!)}
                            className={`text-left ${hasContent ? 'text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2' : 'text-slate-500 dark:text-slate-400 cursor-default'}`}
                            disabled={!hasContent}
                          >
                            {templateName}
                          </button>
                          <span className="text-gray-400 ml-auto">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                        </div>
                        {isExpanded && templateContent && (
                          <div className="mt-1 mb-2 p-2 bg-slate-50 dark:bg-slate-900 border rounded text-xs max-h-32 overflow-y-auto">
                            {log.templateType === 'email' && emailTemplates.find((template) => template.id === log.templateId)?.isHtml ? (
                              <div dangerouslySetInnerHTML={{ __html: templateContent }} />
                            ) : (
                              <div className="whitespace-pre-wrap">{templateContent}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
