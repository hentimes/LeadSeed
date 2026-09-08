import { closeMyAppointmentRow } from '../repositories/agendaRepository';
import type { AgendaAppointment } from '../types';
import { getErrorMessage } from '../utils/errorMessage';
import { esFuncionInexistente } from '../utils/postgrestErrors';

/**
 * Una cita ya terminada y sin cerrar.
 *
 * Lo que la define no es el estado sino la falta de `outcomeRecordedAt`: una
 * cita pasada en 'agendada' no dice que la reunion no ocurriera, dice que
 * nadie conto todavia como fue.
 */
export function estaPendienteDeCierre(cita: AgendaAppointment, ahora = new Date()): boolean {
  if (cita.outcomeRecordedAt) return false;
  if (cita.status === 'cancelada' || cita.status === 'rechazada') return false;

  return new Date(cita.endsAt).getTime() <= ahora.getTime();
}

export interface TareaDeSeguimiento {
  title: string;
  /** Sin fecha es una tarea suelta; el cierre siempre propone una. */
  dueDateIso?: string | null;
}

export interface CierreDeCita {
  appointmentId: string;
  /** Si el contacto se conecto. Decide el estado final de la cita. */
  attended: boolean;
  /** La minuta. Se guarda en la cita. */
  outcomeNotes?: string;
  /**
   * Ademas de en la cita, deja la minuta como nota en la ficha del lead.
   *
   * Es opcional porque son dos lugares con dueños distintos: la cita es de la
   * agenda y se consulta por fecha; la ficha del lead es lo que se lee antes
   * de volver a llamarle. Casi siempre se quieren las dos, pero no siempre.
   */
  tambienComoNotaDelLead?: boolean;
  /** Tareas nacidas de la reunion: otra cita, un llamado, un mensaje. */
  tareas?: TareaDeSeguimiento[];
}

export interface ResultadoDeCierre {
  cita: { id: string; status: string; outcomeRecordedAt?: string };
  notaCreada: boolean;
  tareasCreadas: number;
}

export function mensajeDeCierre(err: unknown): string {
  if (esFuncionInexistente(err)) {
    return 'Falta aplicar la migración pendiente en la base de datos: todavía no existe la función que registra la reunión.';
  }

  return getErrorMessage(err, 'No se pudo registrar cómo fue la reunión');
}

/**
 * Cierra una cita: deja constancia de si el contacto se conecto, guarda la
 * minuta y crea el seguimiento que salga de la reunion.
 *
 * ## Todo o nada
 *
 * Las tres escrituras -el cierre, la nota del lead y las tareas- van en una
 * sola llamada porque ocurren en una sola transaccion del servidor.
 *
 * Antes eran tres llamadas encadenadas, la cita primero, para que un fallo no
 * dejara notas y tareas colgando de una reunion sin registrar. Ese orden
 * evitaba la basura huerfana y creaba el problema opuesto: si la cita se
 * cerraba y fallaba lo de despues, quedaba cerrada -y fuera de "Por
 * registrar"- con el seguimiento a medias y sin forma de reintentarlo. Ahora
 * un fallo no guarda nada y reintentar es igual que la primera vez.
 */
export async function cerrarCita(
  cita: AgendaAppointment,
  cierre: CierreDeCita,
): Promise<ResultadoDeCierre> {
  const minuta = (cierre.outcomeNotes ?? '').trim();
  const tareas = (cierre.tareas ?? []).filter((tarea) => tarea.title.trim().length > 0);

  const fila = await closeMyAppointmentRow({
    appointmentId: cierre.appointmentId,
    attended: cierre.attended,
    outcomeNotes: minuta || undefined,
    // Sin minuta no hay nota que copiar, aunque se haya pedido.
    alsoLeadNote: !!cierre.tambienComoNotaDelLead && !!minuta && !!cita.leadId,
    tasks: tareas.map((tarea) => ({
      title: tarea.title.trim(),
      dueDate: tarea.dueDateIso ?? null,
    })),
  });

  return {
    cita: {
      id: fila.appointment_id,
      status: fila.status,
      outcomeRecordedAt: fila.outcome_recorded_at || undefined,
    },
    notaCreada: fila.note_created,
    tareasCreadas: fila.tasks_created,
  };
}
