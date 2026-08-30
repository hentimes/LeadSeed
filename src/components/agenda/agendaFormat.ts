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

/**
 * COMO SE DICE Y SE PINTA CADA ESTADO DE CITA.
 *
 * Antes se pintaba el valor crudo del backend -`agendada`, `no_asistio`- en
 * una pastilla azul literal. Dos problemas: el usuario leia el nombre interno
 * del estado, y el color era el unico portador.
 *
 * Ahora hay tres senales y el color es la tercera: la palabra, el relleno del
 * punto -lleno es compromiso firme, hueco es sin confirmar- y recien despues
 * el color. Quitale el color y la fila sigue diciendo todo.
 *
 * `agendada` NO esta: es el estado por defecto y no se dibuja. Pintar veinte
 * pastillas que dicen lo mismo no informa, y ese sitio lo ocupa la proximidad,
 * que si varia.
 *
 * `cancelada` tampoco lleva rojo: ya vive en su propia seccion. Gastar el rojo
 * en decorar lo que esta muerto lo deja sin fuerza para el boton que cancela
 * una cita viva.
 */
export const ESTADO_DE_CITA: Record<string, { rotulo: string; color: string; borde: string; relleno: boolean }> = {
  pendiente: { rotulo: 'Sin confirmar', color: 'bg-state-warning-ink', borde: 'border-state-warning-ink', relleno: false },
  confirmada: { rotulo: 'Confirmada', color: 'bg-state-success-ink', borde: 'border-state-success-ink', relleno: true },
  tentativa: { rotulo: 'Tentativa', color: 'bg-ink-muted', borde: 'border-ink-muted', relleno: false },
  completada: { rotulo: 'Realizada', color: 'bg-ink-muted', borde: 'border-ink-muted', relleno: true },
  no_asistio: { rotulo: 'No asistió', color: 'bg-state-warning-ink', borde: 'border-state-warning-ink', relleno: true },
  cancelada: { rotulo: 'Cancelada', color: 'bg-ink-muted', borde: 'border-ink-muted', relleno: false },
  rechazada: { rotulo: 'Rechazada', color: 'bg-ink-muted', borde: 'border-ink-muted', relleno: false },
};

/** El estado de la invitacion, en castellano. Se pintaba crudo y en ingles. */
export const ESTADO_DE_INVITACION: Record<string, string> = {
  pending: 'Sin enviar',
  synced: 'Invitada',
  error: 'Falló el envío',
  skipped: 'Omitida',
};
