import type { AgendaAppointment } from '../types';

type AppointmentAction = 'create' | 'reschedule' | 'cancel';

type AppointmentSyncSnapshot = Pick<AgendaAppointment, 'googleSyncStatus' | 'meetLink' | 'googleSyncError'>;

function normalizeGoogleSyncStatus(value?: string): 'pending' | 'synced' | 'skipped' | 'error' | '' {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'synced' || normalized === 'skipped' || normalized === 'error') {
    return normalized;
  }
  return '';
}

export function isGoogleSyncPending(appointment?: Partial<AppointmentSyncSnapshot> | null): boolean {
  const status = normalizeGoogleSyncStatus(appointment?.googleSyncStatus);
  return status === 'pending' || status === 'error';
}

export function getGoogleSyncBadgeLabel(appointment?: Partial<AppointmentSyncSnapshot> | null): string {
  const status = normalizeGoogleSyncStatus(appointment?.googleSyncStatus);
  if (status === 'pending' || status === 'error') return 'Google pendiente';
  if (status === 'skipped') return 'Google omitido';
  return '';
}

export function getAppointmentSuccessMessage(
  action: AppointmentAction,
  googleStatus?: 'pending' | 'synced' | 'skipped' | 'error' | 'already_synced'
): string {
  const baseMessageByAction: Record<AppointmentAction, string> = {
    create: 'Cita creada y hora bloqueada.',
    reschedule: 'Cita reprogramada en LeadSeed.',
    cancel: 'Cita cancelada en LeadSeed.',
  };

  const normalizedStatus = googleStatus === 'already_synced' ? 'synced' : normalizeGoogleSyncStatus(googleStatus);

  if (!normalizedStatus || normalizedStatus === 'synced') {
    return baseMessageByAction[action];
  }

  if (normalizedStatus === 'skipped') {
    const skippedTailByAction: Record<AppointmentAction, string> = {
      create: 'Google Calendar no genero un evento nuevo en esta pasada.',
      reschedule: 'Google Calendar no tenia un evento previo que actualizar en esta pasada.',
      cancel: 'Google Calendar no tenia un evento previo que cancelar en esta pasada.',
    };
    return `${baseMessageByAction[action]} ${skippedTailByAction[action]}`;
  }

  const pendingTailByAction: Record<AppointmentAction, string> = {
    create: 'Google Calendar sigue pendiente; la hora ya quedo reservada aqui.',
    reschedule: 'Google Calendar sigue pendiente; el nuevo horario ya quedo actualizado aqui.',
    cancel: 'Google Calendar sigue pendiente; la hora ya fue liberada aqui.',
  };

  return `${baseMessageByAction[action]} ${pendingTailByAction[action]}`;
}

export function getGoogleSyncPendingSummary(appointment?: Partial<AppointmentSyncSnapshot> | null): string {
  const status = normalizeGoogleSyncStatus(appointment?.googleSyncStatus);

  if (!status || status === 'synced') {
    return '';
  }

  if (status === 'skipped') {
    return 'Esta cita existe en LeadSeed, pero Google Calendar no tenia un evento previo que sincronizar en esta accion.';
  }

  if (appointment?.meetLink) {
    return 'La cita ya existe en LeadSeed. Google Calendar sigue pendiente de confirmar la sincronizacion.';
  }

  return 'La hora ya quedo reservada en LeadSeed, pero Google Calendar todavia no confirma el evento ni el link Meet.';
}
