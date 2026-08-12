/**
 * Predicado unico sobre el estado de una cita.
 *
 * Existia el mismo Set literal declarado tres veces (`useLeadDetail`,
 * `useLeadsPageController` y `backgroundAgendaAlertsService`) y la comparacion
 * no era consistente entre ellos: dos normalizaban a minusculas y un tercero
 * comparaba el valor crudo que devuelve el backend. Esa rama fallaba en
 * silencio si el estado llegaba capitalizado, y el sintoma no era un error sino
 * una cita activa que simplemente no se encontraba.
 *
 * Ver capitulo 13.4 del roadmap.
 */

/**
 * Estados en los que una cita sigue ocupando el horario del asesor.
 *
 * Los estados que NO estan aca (`cancelada`, `rechazada`, `completada`,
 * `no_asistio`) liberan el slot en la disponibilidad publica.
 */
export const ACTIVE_APPOINTMENT_STATUSES: ReadonlySet<string> = new Set([
  'pendiente',
  'agendada',
  'confirmada',
  'tentativa',
]);

/**
 * Indica si una cita sigue activa, tolerando mayusculas y espacios sobrantes.
 *
 * Acepta `null` y `undefined` para poder aplicarse directo sobre metadata
 * opcional sin que cada llamador repita la comprobacion.
 */
export function isActiveAppointment(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_APPOINTMENT_STATUSES.has(status.trim().toLowerCase());
}
