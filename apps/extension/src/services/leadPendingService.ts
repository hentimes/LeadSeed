import {
  fetchLeadIdsWithPendingTask,
  fetchLeadIdsWithUpcomingAppointment,
} from '../repositories/leadPendingRepository';

/** Que tiene pendiente un lead, para el distintivo de la lista. */
export interface LeadPendingFlags {
  cita: boolean;
  tarea: boolean;
}

/**
 * Lo que cada lead tiene pendiente: una cita por delante, una tarea sin
 * cerrar, o las dos.
 *
 * Las dos consultas van en paralelo y devuelven solo identificadores. El mapa
 * se arma aca y no en el componente para que la lista reciba el dato ya
 * resuelto y la fila solo tenga que preguntar por su propio id.
 */
export async function fetchLeadPendingFlags(
  userId: string,
): Promise<Record<string, LeadPendingFlags>> {
  const [conCita, conTarea] = await Promise.all([
    fetchLeadIdsWithUpcomingAppointment(userId),
    fetchLeadIdsWithPendingTask(userId),
  ]);

  const mapa: Record<string, LeadPendingFlags> = {};

  for (const leadId of conCita) {
    mapa[leadId] = { cita: true, tarea: false };
  }

  for (const leadId of conTarea) {
    const actual = mapa[leadId];
    mapa[leadId] = { cita: actual?.cita ?? false, tarea: true };
  }

  return mapa;
}
