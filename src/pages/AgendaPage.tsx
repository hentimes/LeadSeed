import { useEffect, useRef, useState } from 'react';
import type { AgendaAppointment, AppointmentAuditEvent, AppointmentParticipant, Page } from '../types';
import {
  addMyAppointmentParticipant,
  cancelMyAppointment,
  deleteMyAppointmentParticipant,
  getDefaultAgendaRange,
  listMyAppointmentAuditEvents,
  listMyAppointmentParticipants,
  listMyAppointments,
  rescheduleMyAppointment,
  subscribeToMyAgendaChanges,
  syncMyGoogleCalendarAttendees,
  unsubscribeFromMyAgendaChanges,
} from '../services/agendaService';
import {
  getAppointmentSuccessMessage,
  getGoogleSyncBadgeLabel,
  getGoogleSyncPendingSummary,
} from '../utils/appointmentStatusCopy';
import { Icon } from '../utils/icons';

interface AgendaPageProps {
  onNavigate: (page: Page) => void;
}

interface ParticipantFormState {
  name: string;
  email: string;
}

interface RescheduleFormState {
  date: string;
  time: string;
}

const CLOSED_STATUSES = new Set(['cancelada', 'rechazada']);
const EVENT_TYPE_LABELS: Record<AppointmentAuditEvent['eventType'], string> = {
  created_from_lead: 'Creada',
  rescheduled: 'Reprogramada',
  cancelled: 'Cancelada',
  google_sync_error: 'Google pendiente',
  participant_added: 'Participante agregado',
  participant_removed: 'Participante quitado',
};

function readAppointmentIdFromHash(): string {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#agenda')) return '';
  const match = hash.match(/[?&]appointment=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateInputValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toIsoLocal(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getMinutesUntil(value: string): number {
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function getAppointmentNotice(appointment: AgendaAppointment): string {
  const minutesUntil = getMinutesUntil(appointment.startsAt);

  if (minutesUntil < 0 || minutesUntil > 120) return '';
  if (minutesUntil <= 15) return 'Cita por iniciar';
  if (minutesUntil <= 60) return 'Cita dentro de 1 hora';
  return 'Cita dentro de 2 horas';
}

function defaultParticipantForm(): ParticipantFormState {
  return { name: '', email: '' };
}

function defaultRescheduleForm(appointment: AgendaAppointment): RescheduleFormState {
  return {
    date: toDateInputValue(appointment.startsAt),
    time: toTimeInputValue(appointment.startsAt),
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function openMeetLink(meetLink: string): void {
  window.open(meetLink, '_blank', 'noopener,noreferrer');
}

function formatAuditEventSummary(event: AppointmentAuditEvent): string {
  if (event.eventType === 'rescheduled' && event.previousStartTime && event.nextStartTime) {
    return `${formatDateTime(event.previousStartTime)} -> ${formatDateTime(event.nextStartTime)}`;
  }

  if (event.note) {
    return event.note;
  }

  if (event.eventType === 'cancelled' && event.nextStatus) {
    return `Estado final: ${event.nextStatus}`;
  }

  return 'Sin detalle adicional';
}

export default function AgendaPage({ onNavigate }: AgendaPageProps) {
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [auditEvents, setAuditEvents] = useState<AppointmentAuditEvent[]>([]);
  const [participants, setParticipants] = useState<AppointmentParticipant[]>([]);
  const [participantForms, setParticipantForms] = useState<Record<string, ParticipantFormState>>({});
  const [rescheduleForms, setRescheduleForms] = useState<Record<string, RescheduleFormState>>({});
  const [expandedParticipants, setExpandedParticipants] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [participantActionId, setParticipantActionId] = useState('');
  const [appointmentActionId, setAppointmentActionId] = useState('');
  const [focusedAppointmentId, setFocusedAppointmentId] = useState('');
  const appointmentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeAppointments = appointments.filter((appointment) => !CLOSED_STATUSES.has(appointment.status));
  const cancelledAppointments = appointments
    .filter((appointment) => CLOSED_STATUSES.has(appointment.status))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const loadAgenda = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const range = getDefaultAgendaRange(60);
    try {
      const [nextAppointments, nextParticipants, nextAuditEvents] = await Promise.all([
        listMyAppointments(range.from, range.to),
        listMyAppointmentParticipants(range.from, range.to),
        listMyAppointmentAuditEvents(range.from, range.to),
      ]);
      setAppointments(nextAppointments);
      setParticipants(nextParticipants);
      setAuditEvents(nextAuditEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda();

    let active = true;
    let channel: Awaited<ReturnType<typeof subscribeToMyAgendaChanges>> = null;

    void subscribeToMyAgendaChanges(() => {
      void loadAgenda(true);
    }).then((nextChannel) => {
      if (!active && nextChannel) {
        void unsubscribeFromMyAgendaChanges(nextChannel);
        return;
      }
      channel = nextChannel;
    });

    return () => {
      active = false;
      if (channel) void unsubscribeFromMyAgendaChanges(channel);
    };
  }, []);

  useEffect(() => {
    const syncFocusedAppointmentFromHash = () => {
      setFocusedAppointmentId(readAppointmentIdFromHash());
    };

    syncFocusedAppointmentFromHash();
    window.addEventListener('hashchange', syncFocusedAppointmentFromHash);
    return () => window.removeEventListener('hashchange', syncFocusedAppointmentFromHash);
  }, []);

  useEffect(() => {
    if (!focusedAppointmentId) return;
    const targetAppointment = appointments.find((appointment) => appointment.id === focusedAppointmentId);
    if (!targetAppointment) return;

    if (CLOSED_STATUSES.has(targetAppointment.status)) {
      setShowCancelled(true);
    } else {
      setExpandedParticipants((current) => (
        current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }
      ));
      setExpandedHistory((current) => (
        current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }
      ));
    }

    const timeoutId = window.setTimeout(() => {
      appointmentRefs.current[focusedAppointmentId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);

    return () => window.clearTimeout(timeoutId);
  }, [appointments, focusedAppointmentId]);

  const getParticipantsForAppointment = (appointmentId: string) =>
    participants.filter((participant) => participant.appointmentId === appointmentId);

  const getAuditEventsForAppointment = (appointmentId: string) =>
    auditEvents.filter((event) => event.appointmentId === appointmentId);

  const getParticipantForm = (appointmentId: string) =>
    participantForms[appointmentId] || defaultParticipantForm();

  const getRescheduleForm = (appointment: AgendaAppointment) =>
    rescheduleForms[appointment.id] || defaultRescheduleForm(appointment);

  const updateParticipantForm = (appointmentId: string, patch: Partial<ParticipantFormState>) => {
    setParticipantForms((current) => ({
      ...current,
      [appointmentId]: { ...(current[appointmentId] || defaultParticipantForm()), ...patch },
    }));
  };

  const updateRescheduleForm = (appointment: AgendaAppointment, patch: Partial<RescheduleFormState>) => {
    setRescheduleForms((current) => ({
      ...current,
      [appointment.id]: { ...(current[appointment.id] || defaultRescheduleForm(appointment)), ...patch },
    }));
  };

  const openLead = (leadId?: string) => {
    if (!leadId) return;
    window.location.hash = `#leads?lead=${leadId}`;
    onNavigate('leads');
  };

  const openFocusedAppointment = (appointmentId?: string) => {
    if (!appointmentId) return;
    window.location.hash = `#agenda?appointment=${appointmentId}`;
    setFocusedAppointmentId(appointmentId);
  };

  const handleRescheduleAppointment = async (appointment: AgendaAppointment) => {
    const form = getRescheduleForm(appointment);

    if (!form.date || !form.time) {
      setError('Completa fecha y hora para reprogramar');
      return;
    }

    const startsAt = toIsoLocal(form.date, form.time);
    if (new Date(startsAt) <= new Date()) {
      setError('La nueva hora debe ser futura');
      return;
    }

    setAppointmentActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      const result = await rescheduleMyAppointment(appointment.id, startsAt);
      await loadAgenda(true);
      setMessage(getAppointmentSuccessMessage('reschedule', result.googleSyncStatus));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita');
      await loadAgenda(true);
    } finally {
      setAppointmentActionId('');
    }
  };

  const handleCancelAppointment = async (appointment: AgendaAppointment) => {
    if (!confirm('Cancelar esta cita? El horario quedara disponible.')) return;

    setAppointmentActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      const result = await cancelMyAppointment(appointment.id, 'Cancelada desde MENSAJES');
      await loadAgenda(true);
      setMessage(getAppointmentSuccessMessage('cancel', result.googleSyncStatus));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la cita');
      await loadAgenda(true);
    } finally {
      setAppointmentActionId('');
    }
  };

  const syncParticipantsAfterChange = async (appointmentId: string) => {
    const result = await syncMyGoogleCalendarAttendees(appointmentId);
    setMessage(result.status === 'skipped' ? 'Participante guardado; se invitara cuando exista evento Google' : `Participantes sincronizados: ${result.attendeesCount}`);
  };

  const handleAddParticipant = async (appointment: AgendaAppointment) => {
    const form = getParticipantForm(appointment.id);
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (!isValidEmail(email)) {
      setError('Ingresa un email valido para el participante');
      return;
    }

    setParticipantActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      await addMyAppointmentParticipant({
        appointmentId: appointment.id,
        email,
        name,
        participantRole: 'guest',
      });
      await syncParticipantsAfterChange(appointment.id);
      setParticipantForms((current) => ({ ...current, [appointment.id]: defaultParticipantForm() }));
      await loadAgenda(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el participante');
      await loadAgenda(true);
    } finally {
      setParticipantActionId('');
    }
  };

  const handleDeleteParticipant = async (appointmentId: string, participantId: string) => {
    setParticipantActionId(participantId);
    setMessage('');
    setError('');
    try {
      await deleteMyAppointmentParticipant(participantId);
      await syncParticipantsAfterChange(appointmentId);
      await loadAgenda(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el participante');
      await loadAgenda(true);
    } finally {
      setParticipantActionId('');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400 py-6">Cargando agenda...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pt-2 flex flex-col gap-4">
      <div className="border-y border-slate-200/80 dark:border-slate-700/60 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Agenda</h2>
            <p className="text-xs text-slate-400 mt-1">Citas, alertas, Meet, reprogramacion y cancelaciones.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="text-xs font-semibold text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded hover:bg-blue-50"
          >
            Configurar
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`text-xs px-3 py-2 rounded border ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Citas activas</h3>
        <span className="text-[11px] text-slate-400">{activeAppointments.length} activas</span>
      </div>

      <div className="flex flex-col gap-3">
        {activeAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 border-y border-slate-200/80 py-4">No hay citas activas en el rango revisado.</p>
        ) : (
          activeAppointments.map((appointment) => {
            const notice = getAppointmentNotice(appointment);
            const appointmentParticipants = getParticipantsForAppointment(appointment.id);
            const appointmentAuditEvents = getAuditEventsForAppointment(appointment.id);
            const participantForm = getParticipantForm(appointment.id);
            const rescheduleForm = getRescheduleForm(appointment);
            const isAppointmentBusy = appointmentActionId === appointment.id;
            const participantsOpen = expandedParticipants[appointment.id] === true;
            const historyOpen = expandedHistory[appointment.id] === true;
            const isFocusedAppointment = focusedAppointmentId === appointment.id;
            const googleSyncBadgeLabel = getGoogleSyncBadgeLabel(appointment);
            const googlePendingSummary = getGoogleSyncPendingSummary(appointment);

            return (
              <div
                key={appointment.id}
                ref={(node) => {
                  appointmentRefs.current[appointment.id] = node;
                }}
                className={`border-l-2 pl-3 py-1 rounded-r ${isFocusedAppointment ? 'bg-blue-50/70 ring-1 ring-blue-200' : ''} ${notice ? 'border-l-amber-500' : 'border-l-blue-500'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openLead(appointment.leadId)}
                    className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-blue-700 text-left"
                  >
                    {appointment.leadName}
                  </button>
                  <div className="flex items-center gap-1">
                    {isFocusedAppointment && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Seleccionada</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{appointment.status}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">{formatDateTime(appointment.startsAt)} - {appointment.sourceChannel}</p>

                {(notice || appointment.meetLink || googleSyncBadgeLabel) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {notice && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                        {notice}
                      </span>
                    )}
                    {googleSyncBadgeLabel && (
                      <span
                        className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded"
                        title={appointment.googleSyncError || googlePendingSummary}
                      >
                        {googleSyncBadgeLabel}
                      </span>
                    )}
                    {appointment.meetLink && (
                      <button
                        type="button"
                        onClick={() => openMeetLink(appointment.meetLink as string)}
                        className="text-[10px] font-semibold text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-50"
                      >
                        Abrir Meet
                      </button>
                    )}
                  </div>
                )}

                {googlePendingSummary && (
                  <p className="mt-1 text-[10px] leading-4 text-amber-800">
                    {googlePendingSummary}
                  </p>
                )}

                <div className="mt-2 grid grid-cols-[1fr_0.8fr] sm:grid-cols-[1fr_0.8fr_92px_72px] gap-1.5">
                  <input
                    type="date"
                    value={rescheduleForm.date}
                    onChange={(event) => updateRescheduleForm(appointment, { date: event.target.value })}
                    className="border border-slate-300 dark:border-slate-600/50 rounded px-2 py-1 text-[11px] bg-transparent"
                  />
                  <input
                    type="time"
                    value={rescheduleForm.time}
                    onChange={(event) => updateRescheduleForm(appointment, { time: event.target.value })}
                    className="border border-slate-300 dark:border-slate-600/50 rounded px-2 py-1 text-[11px] bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRescheduleAppointment(appointment)}
                    disabled={isAppointmentBusy}
                    className="text-[11px] font-semibold text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-40"
                  >
                    Reprogramar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCancelAppointment(appointment)}
                    disabled={isAppointmentBusy}
                    className="text-[11px] font-semibold text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="mt-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedParticipants((current) => ({ ...current, [appointment.id]: !participantsOpen }))}
                      className="text-[11px] font-semibold text-slate-500 hover:text-blue-700"
                    >
                      Participantes ({appointmentParticipants.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedHistory((current) => ({ ...current, [appointment.id]: !historyOpen }))}
                      className="text-[11px] font-semibold text-slate-500 hover:text-blue-700"
                    >
                      Historial ({appointmentAuditEvents.length})
                    </button>
                  </div>

                  {participantsOpen && (
                    <div className="mt-2 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                      {appointmentParticipants.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {appointmentParticipants.map((participant) => (
                            <span
                              key={participant.id}
                              className="inline-flex items-center gap-1 text-[10px] border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300"
                              title={participant.googleSyncError || participant.invitationStatus}
                            >
                              <span>{participant.name || participant.email}</span>
                              <span className="text-[9px] uppercase tracking-wide text-slate-400">
                                {participant.invitationStatus}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteParticipant(appointment.id, participant.id)}
                                disabled={participantActionId === participant.id}
                                className="text-slate-400 hover:text-red-600 disabled:opacity-40"
                                title="Quitar participante"
                              >
                                <Icon.Close />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1fr_72px] gap-1.5">
                        <input
                          value={participantForm.name}
                          onChange={(event) => updateParticipantForm(appointment.id, { name: event.target.value })}
                          placeholder="Nombre"
                          className="border border-slate-300 dark:border-slate-600/50 rounded px-2 py-1 text-[11px] bg-transparent"
                        />
                        <input
                          value={participantForm.email}
                          onChange={(event) => updateParticipantForm(appointment.id, { email: event.target.value })}
                          placeholder="email@dominio.cl"
                          className="border border-slate-300 dark:border-slate-600/50 rounded px-2 py-1 text-[11px] bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => void handleAddParticipant(appointment)}
                          disabled={participantActionId === appointment.id}
                          className="text-[11px] font-semibold text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-40"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  )}

                  {historyOpen && (
                    <div className="mt-2 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                      {appointmentAuditEvents.length === 0 ? (
                        <p className="text-[11px] text-slate-400">Sin cambios registrados todavia.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {appointmentAuditEvents.map((event) => (
                            <div key={event.id} className="border-l-2 border-l-slate-200 pl-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {EVENT_TYPE_LABELS[event.eventType]}
                                </span>
                                <span className="text-[10px] text-slate-400">{formatDateTime(event.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-slate-600">{formatAuditEventSummary(event)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-y border-slate-200/80 dark:border-slate-700/60 py-3">
        <button
          type="button"
          onClick={() => setShowCancelled((current) => !current)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500"
        >
          <span>Canceladas ({cancelledAppointments.length})</span>
          <span>{showCancelled ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
        </button>

        {showCancelled && (
          <div className="mt-3 flex flex-col gap-2">
            {cancelledAppointments.length === 0 ? (
              <p className="text-xs text-slate-400">No hay citas canceladas en el rango revisado.</p>
            ) : (
              cancelledAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  ref={(node) => {
                    appointmentRefs.current[appointment.id] = node;
                  }}
                  className={`border-l-2 border-l-slate-300 pl-3 py-1 rounded-r ${focusedAppointmentId === appointment.id ? 'bg-slate-100/80 ring-1 ring-slate-200' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openLead(appointment.leadId)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate hover:text-blue-700 text-left"
                    >
                      {appointment.leadName}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openFocusedAppointment(appointment.id)}
                        className="text-[10px] font-semibold text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-50"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => openLead(appointment.leadId)}
                        className="text-[10px] font-semibold text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-50"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Creada: {formatDateTime(appointment.createdAt)}</p>
                  <p className="text-[11px] text-slate-400">Cancelada: {formatDateTime(appointment.updatedAt)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
