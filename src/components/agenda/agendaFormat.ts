import type { AgendaAppointment, AppointmentAuditEvent } from '../../types';

export const EVENT_TYPE_LABELS: Record<AppointmentAuditEvent['eventType'], string> = {
  created_from_lead: 'Creada',
  rescheduled: 'Reprogramada',
  cancelled: 'Cancelada',
  google_sync_error: 'Google pendiente',
  participant_added: 'Participante agregado',
  participant_removed: 'Participante quitado',
};

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getMinutesUntil(value: string): number {
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

export function getAppointmentNotice(appointment: AgendaAppointment): string {
  const minutesUntil = getMinutesUntil(appointment.startsAt);

  if (minutesUntil < 0 || minutesUntil > 120) return '';
  if (minutesUntil <= 15) return 'Cita por iniciar';
  if (minutesUntil <= 60) return 'Cita dentro de 1 hora';
  return 'Cita dentro de 2 horas';
}

export function formatAuditEventSummary(event: AppointmentAuditEvent): string {
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

export function openMeetLink(meetLink: string): void {
  window.open(meetLink, '_blank', 'noopener,noreferrer');
}
