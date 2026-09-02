import { useEffect, useRef, useState } from 'react';
import { rangoParaPeriodo } from '../utils/agendaGrid';
import { isActiveAppointment } from '../utils/appointmentStatus';
import { getCurrentSession } from '../services/authService';
import {
  cerrarCita,
  estaPendienteDeCierre,
  mensajeDeCierre,
  type CierreDeCita,
} from '../services/appointmentOutcomeService';
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
import { getPlatform } from '../platform/registry';
import { getErrorMessage } from '../utils/errorMessage';

export interface ParticipantFormState {
  name: string;
  email: string;
}

export interface RescheduleFormState {
  date: string;
  time: string;
}

/*
 * Las citas cerradas salen de `isActiveAppointment`, no de un Set propio.
 *
 * Habia uno aca -`['cancelada', 'rechazada']`- y discrepaba del catalogo real:
 * `appointmentStatus.ts` dice que 'completada' y 'no_asistio' TAMBIEN liberan
 * el horario. Con el Set local, una cita ya realizada seguia figurando en
 * "Citas activas" durante los sesenta dias del rango.
 *
 * Y ese archivo existe justamente para esto: su ficha cuenta que el mismo Set
 * estaba declarado tres veces con criterios distintos, y que una de las copias
 * comparaba el valor crudo sin normalizar mayusculas. Esta era la cuarta, con
 * los dos defectos.
 */

function readAppointmentIdFromHash(): string {
  const route = getPlatform().navigation.current();
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

  /*
   * Una cita que ya termino y sigue sin cerrar no es lo mismo que una que esta
   * por venir: no se reprograma, se cuenta. Salen de "Citas activas" y pasan a
   * su propio grupo, arriba, que es lo que hay que despachar.
   */
  const pendingOutcomeAppointments = appointments
    .filter((appointment) => isActiveAppointment(appointment.status))
    .filter((appointment) => estaPendienteDeCierre(appointment))
    // De la mas reciente hacia atras: lo que acaba de pasar es lo que se
    // recuerda con detalle.
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const activeAppointments = appointments
    .filter((appointment) => isActiveAppointment(appointment.status))
    .filter((appointment) => !estaPendienteDeCierre(appointment))
    // Por cuando empieza. Las canceladas ya se ordenaban; las activas quedaban
    // en el orden en que las devolviera la consulta, o sea ninguno.
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  /*
   * Las cerradas no son canceladas.
   *
   * `isActiveAppointment` es false para las cuatro que liberan el horario, asi
   * que 'completada' y 'no_asistio' caian bajo el rotulo "Canceladas": una
   * reunion que ocurrio y se registro aparecia como si no hubiera ocurrido.
   */
  const closedAppointments = appointments
    .filter((appointment) => appointment.status === 'completada' || appointment.status === 'no_asistio')
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const cancelledAppointments = appointments
    .filter((appointment) => appointment.status === 'cancelada' || appointment.status === 'rechazada')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  /**
   * El periodo que esta mirando el calendario, si hay alguno.
   *
   * `null` en la vista lista, que sigue con los sesenta dias de siempre.
   */
  const [rangoVisible, setRangoVisible] = useState<{ desde: Date; hasta: Date } | null>(null);

  const loadAgenda = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    /*
     * El rango sale del periodo que se este mirando, no de un `60` fijo.
     *
     * Con el rango fijo -de hoy a hoy+60- navegar al mes pasado en el calendario
     * mostraba una grilla vacia. Y eso no es "no hay citas": es que no se
     * pidieron. Un calendario vacio es una AFIRMACION, y esa afirmacion habria
     * sido falsa.
     *
     * `rangoParaPeriodo` agrega una semana a cada lado, asi que moverse un mes
     * suele caer dentro de lo ya cargado y las flechas no parpadean.
     */
    const range = rangoVisible
      ? rangoParaPeriodo(rangoVisible.desde, rangoVisible.hasta)
      : getDefaultAgendaRange(60);
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
      setError(getErrorMessage(err, 'No se pudo cargar la agenda'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /*
   * Al cambiar de periodo se recarga. Las claves son cadenas y no los `Date`:
   * un objeto nuevo en cada render dispararia la carga sin parar.
   */
  useEffect(() => {
    if (!rangoVisible) return;
    void loadAgenda(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangoVisible?.desde.getTime(), rangoVisible?.hasta.getTime()]);

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
    return getPlatform().navigation.subscribe(syncFocusedAppointmentFromHash);
  }, []);

  useEffect(() => {
    if (!focusedAppointmentId) return;
    const targetAppointment = appointments.find((appointment) => appointment.id === focusedAppointmentId);
    if (!targetAppointment) return;

    if (!isActiveAppointment(targetAppointment.status)) {
      setShowCancelled(true);
    } else {
      setExpandedParticipants((current) => (current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }));
      setExpandedHistory((current) => (current[focusedAppointmentId] ? current : { ...current, [focusedAppointmentId]: true }));
    }

    const timeoutId = setTimeout(() => {
      appointmentRefs.current[focusedAppointmentId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);

    return () => clearTimeout(timeoutId);
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
    getPlatform().navigation.replace({ name: 'agenda', appointmentId });
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
      setError(getErrorMessage(err, 'No se pudo reprogramar la cita'));
      await loadAgenda(true);
    } finally {
      setAppointmentActionId('');
    }
  };

  const handleCancelAppointment = async (appointment: AgendaAppointment) => {
    /*
     * Se avisa de la consecuencia que el usuario NO ve desde aca: al invitado le
     * llega el aviso de cancelacion. Cancelar una cita toca a un tercero, y eso
     * merece decirse antes y no descubrirse despues.
     */
    const confirmado = await getPlatform().dialogs.confirm(
      'El horario queda disponible y se avisa a quien estaba invitado.',
      {
        title: '¿Cancelar esta cita?',
        confirmLabel: 'Cancelar la cita',
        cancelLabel: 'Volver',
        tone: 'danger',
      },
    );
    if (!confirmado) return;

    setAppointmentActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      const result = await cancelMyAppointment(appointment.id, 'Cancelada desde LeadSeed');
      await loadAgenda(true);
      setMessage(getAppointmentSuccessMessage('cancel', result.googleSyncStatus));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la cita'));
      await loadAgenda(true);
    } finally {
      setAppointmentActionId('');
    }
  };

  /**
   * Cierra una cita ya pasada: asistencia, minuta y el seguimiento que salga.
   *
   * Recarga la agenda al terminar, igual que reprogramar o cancelar: la cita
   * cambia de estado y de grupo, y sin recargar seguiria en "Por registrar".
   */
  const handleRecordOutcome = async (
    appointment: AgendaAppointment,
    cierre: Omit<CierreDeCita, 'appointmentId'>,
  ): Promise<boolean> => {
    const userId = (await getCurrentSession())?.user?.id;
    if (!userId) {
      // Salia sin decir nada y la pantalla se quedaba igual, que es
      // indistinguible de "no hizo nada".
      setError('No hay sesión activa. Volvé a entrar para registrar la reunión.');
      return false;
    }

    setAppointmentActionId(appointment.id);
    setMessage('');
    setError('');
    try {
      const resultado = await cerrarCita(userId, appointment, {
        ...cierre,
        appointmentId: appointment.id,
      });
      await loadAgenda(true);

      const partes = [cierre.attended ? 'Reunión registrada' : 'Registrada como no asistida'];
      if (resultado.notaCreada) partes.push('nota agregada al lead');
      if (resultado.tareasCreadas > 0) {
        partes.push(
          resultado.tareasCreadas === 1 ? '1 tarea creada' : `${resultado.tareasCreadas} tareas creadas`,
        );
      }
      setMessage(`${partes.join(', ')}.`);
      return true;
    } catch (err) {
      /*
       * No se recarga la agenda aca, y no es un descuido: `loadAgenda` empieza
       * con `setError('')`, asi que recargar despues de poner el mensaje lo
       * borraba en el mismo instante y el fallo quedaba mudo. Ademas no hay
       * nada que recargar: si el cierre fallo, en la base no cambio nada.
       */
      setError(mensajeDeCierre(err));
      return false;
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
      setError(getErrorMessage(err, 'No se pudo agregar el participante'));
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
      setError(getErrorMessage(err, 'No se pudo quitar el participante'));
      await loadAgenda(true);
    } finally {
      setParticipantActionId('');
    }
  };

  return {
    loading,
    message,
    error,
    /** Todas, sin filtrar por estado: el calendario decide que pinta. */
    appointments,
    setRangoVisible,
    activeAppointments,
    pendingOutcomeAppointments,
    handleRecordOutcome,
    closedAppointments,
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
