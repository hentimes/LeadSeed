import {
  fetchLeadIdsWithPendingTask,
  fetchLeadIdsWithUpcomingAppointment,
} from '../repositories/leadPendingRepository';

/**
 * Que tiene pendiente un lead, para el distintivo de la lista.
 *
 * Guarda el identificador y no un booleano porque el distintivo es un boton:
 * lleva a esa cita y a esa tarea, no a la pantalla en general.
 */
export interface LeadPendingFlags {
  /** La cita mas proxima, si tiene alguna por delante. */
  citaId?: string;
  /** La tarea que vence antes, si tiene alguna sin cerrar. */
  tareaId?: string;
}

/**
 * Lo que cada lead tiene pendiente: una cita por delante, una tarea sin
 * cerrar, o las dos.
 *
 * Las dos consultas van en paralelo y llegan ordenadas, asi que la primera de
 * cada lead es la que se queda: la cita mas proxima y la tarea que vence
 * antes. Las siguientes se descartan.
 */
export async function fetchLeadPendingFlags(
  userId: string,
): Promise<Record<string, LeadPendingFlags>> {
  const [citas, tareas] = await Promise.all([
    fetchLeadIdsWithUpcomingAppointment(userId),
    fetchLeadIdsWithPendingTask(userId),
  ]);

  const mapa: Record<string, LeadPendingFlags> = {};

  for (const cita of citas) {
    if (mapa[cita.leadId]?.citaId) continue;
    mapa[cita.leadId] = { ...mapa[cita.leadId], citaId: cita.id };
  }

  for (const tarea of tareas) {
    if (mapa[tarea.leadId]?.tareaId) continue;
    mapa[tarea.leadId] = { ...mapa[tarea.leadId], tareaId: tarea.id };
  }

  return mapa;
}
