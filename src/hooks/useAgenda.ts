import { useEffect, useRef, useState } from 'react';
import type { AgendaAppointment, AppointmentAuditEvent, AppointmentParticipant } from '../types';
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
import { getAppointmentSuccessMessage } from '../utils/appointmentStatusCopy';
import { webDialogs, webNavigation } from '../platform/web';

export interface ParticipantFormState {
  name: string;
  email: string;
}

export interface RescheduleFormState {
  date: string;
  time: string;
}

export const CLOSED_STATUSES = new Set(['cancelada', 'rechazada']);

function readAppointmentIdFromHash(): string {
  const route = webNavigation.current();
  return route?.name === 'agenda' ? (route.appointmentId ?? '') : '';
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

export function useAgenda() {
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
      setExpandedParticipants((current) => (current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }));
      setExpandedHistory((current) => (current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }));
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

  const getParticipantForm = (appointmentId: string) => participantForms[appointmentId] || defaultParticipantForm();

  const getRescheduleForm = (appointment: AgendaAppointment) => rescheduleForms[appointment.id] || defaultRescheduleForm(appointment);

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

  const openFocusedAppointment = (appointmentId?: string) => {
    if (!appointmentId) return;
    webNavigation.replace({ name: 'agenda', appointmentId });
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
    if (!(await webDialogs.confirm('Cancelar esta cita? El horario quedara disponible.'))) return;

    setAppointmentActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      const result = await cancelMyAppointment(appointment.id, 'Cancelada desde LeadSeed');
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
    setMessage(
      result.status === 'skipped'
        ? 'Participante guardado; se invitara cuando exista evento Google'
        : `Participantes sincronizados: ${result.attendeesCount}`,
    );
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

  return {
    loading,
    message,
    error,
    activeAppointments,
    cancelledAppointments,
    showCancelled,
    setShowCancelled,
    focusedAppointmentId,
    appointmentRefs,
    participantActionId,
    appointmentActionId,

    getParticipantsForAppointment,
    getAuditEventsForAppointment,
    getParticipantForm,
    getRescheduleForm,
    updateParticipantForm,
    updateRescheduleForm,
    openFocusedAppointment,
    handleRescheduleAppointment,
    handleCancelAppointment,
    handleAddParticipant,
    handleDeleteParticipant,

    expandedParticipants,
    setExpandedParticipants,
    expandedHistory,
    setExpandedHistory,
  };
}

export type UseAgendaResult = ReturnType<typeof useAgenda>;
