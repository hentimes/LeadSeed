/**
 * Fecha y hora de una cita, tal como las escribe una persona.
 *
 * Estaban dentro de `useLeadDetail`, que era el unico sitio desde el que se
 * agendaba. Al poder agendar tambien al cerrar una reunion hacen falta en dos
 * lugares, y duplicarlas invitaria a que una de las dos copias derivara.
 */

/** Hoy, en el formato que espera un `<input type="date">`. */
export function todayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Junta fecha y hora locales en un instante absoluto.
 *
 * `new Date('2026-09-03T15:00:00')` sin zona lo interpreta el navegador en
 * hora local, que es justo lo que se quiere: quien agenda escribe SU hora.
 */
export function toIsoLocal(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** La fecha de dentro de `dias`, para proponer una por defecto. */
export function dateInDays(dias: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dias);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
