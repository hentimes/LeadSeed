import type { Lead } from '../types';
import { cancelMyAppointment, getDefaultAgendaRange, listMyAppointments } from './agendaService';
import { isActiveAppointment } from '../utils/appointmentStatus';

/**
 * CANCELAR LA CITA DE UN LEAD ANTES DE BORRARLO
 *
 * ## Por que existe
 *
 * Borrar un lead que tiene una cita activa y no cancelarla deja una cita
 * huerfana: sigue en la agenda -y en Google Calendar si esta sincronizado-
 * apuntando a alguien que ya no esta.
 *
 * `useLeadsPageController` ya resolvia esto, pero la logica vivia encerrada
 * dentro del hook, sin exportar. Cualquier otra pantalla que quisiera borrar un
 * lead tenia dos opciones: reimplementarla o saltearla. La segunda es la que
 * pasa siempre, porque el que borra no sabe que existe.
 *
 * Se extrae aca para que haya un solo camino. No se cambia el comportamiento;
 * se le pone nombre y se lo hace alcanzable.
 *
 * ## Como averigua si hay cita
 *
 * Primero mira los metadatos del propio lead, que es gratis. Solo si no
 * alcanzan -y hay indicios de que podria haber cita- pregunta a la agenda, que
 * cuesta una consulta. Un lead sin `scheduledAt` y sin estado de cita activa
 * no llega a preguntar nunca.
 */

function metadatosDeCita(lead: Lead): { citaId: string; estado: string } {
  const meta = (lead.metadata ?? {}) as Record<string, unknown>;
  const citaId = typeof meta.appointment_id === 'string' ? meta.appointment_id : '';
  const estado = typeof meta.appointment_status === 'string' ? meta.appointment_status : '';
  return { citaId, estado };
}

/** El id de la cita activa del lead, o cadena vacia si no tiene. */
export async function buscarCitaActivaDelLead(lead: Lead): Promise<string> {
  const { citaId, estado } = metadatosDeCita(lead);

  if (citaId && isActiveAppointment(estado)) return citaId;
  if (!lead.id) return '';

  // Sin fecha agendada y sin estado activo no hay motivo para consultar.
  if (!lead.scheduledAt && !isActiveAppointment(estado)) return '';

  const rango = getDefaultAgendaRange(365);
  const citas = await listMyAppointments(rango.from, rango.to);
  const cita = citas.find((item) => item.leadId === lead.id && isActiveAppointment(item.status));

  return cita?.id || '';
}

/**
 * Cancela la cita, si la hay.
 *
 * Un fallo de sincronizacion con Google no aborta el borrado: la cita ya quedo
 * cancelada de este lado, y dejar el lead a medio borrar por un servicio
 * externo seria peor. Se registra y se sigue.
 */
export async function cancelarCitaAntesDeBorrar(lead: Lead, citaId: string): Promise<void> {
  if (!citaId) return;

  const resultado = await cancelMyAppointment(
    citaId,
    `Cita cancelada por eliminacion del lead ${lead.name}`,
  );

  if (resultado.googleSyncError) {
    console.warn(
      'Google Calendar quedo pendiente al cancelar la cita por eliminacion del lead:',
      resultado.googleSyncError,
    );
  }
}
