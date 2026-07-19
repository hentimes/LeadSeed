import type { AgendaAppointment } from '../types';

type AppointmentAction = 'create' | 'reschedule' | 'cancel';

type AppointmentSyncSnapshot = Pick<AgendaAppointment, 'googleSyncStatus' | 'meetLink' | 'googleSyncError'>;

export function isGoogleSyncPending(appointment?: Partial<AppointmentSyncSnapshot> | null): boolean {
  return appointment?.googleSyncStatus === 'error';
}

export function getAppointmentSuccessMessage(action: AppointmentAction, googlePending: boolean): string {
  const baseMessageByAction: Record<AppointmentAction, string> = {
    create: 'Cita creada y hora bloqueada.',
    reschedule: 'Cita reprogramada en MENSAJES.',
    cancel: 'Cita cancelada en MENSAJES.',
  };

  if (!googlePending) {
    return baseMessageByAction[action];
  }

  const pendingTailByAction: Record<AppointmentAction, string> = {
    create: 'Google Calendar sigue pendiente; la hora ya quedo reservada aqui.',
    reschedule: 'Google Calendar sigue pendiente; el nuevo horario ya quedo actualizado aqui.',
    cancel: 'Google Calendar sigue pendiente; la hora ya fue liberada aqui.',
  };

  return `${baseMessageByAction[action]} ${pendingTailByAction[action]}`;
}

export function getGoogleSyncPendingSummary(appointment?: Partial<AppointmentSyncSnapshot> | null): string {
  if (!isGoogleSyncPending(appointment)) {
    return '';
  }

  if (appointment?.meetLink) {
    return 'La cita ya existe en MENSAJES. Google Calendar sigue pendiente de confirmar la sincronizacion.';
  }

  return 'La hora ya quedo reservada en MENSAJES, pero Google Calendar todavia no confirma el evento ni el link Meet.';
}

