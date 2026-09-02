import { recordMyAppointmentOutcomeRow } from '../repositories/agendaRepository';
import { createTaskRow } from '../repositories/tasksRepository';
import { createLeadNote } from './leadDetailService';
import type { AgendaAppointment } from '../types';
import { getErrorMessage } from '../utils/errorMessage';

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

/**
 * PostgREST devuelve PGRST202 cuando la funcion no existe en el esquema.
 *
 * Pasa con la migracion 139 sin aplicar: el codigo ya la llama y la base
 * todavia no la tiene. El mensaje crudo -"Could not find the function..."- no
 * le dice nada a quien lo lee desde la agenda, y sin explicacion el sintoma
 * parece que la pantalla no hace nada.
 */
function esFuncionInexistente(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const codigo = String((err as { code?: unknown }).code ?? '');
  const mensaje = String((err as { message?: unknown }).message ?? '');

  return codigo === 'PGRST202' || mensaje.includes('Could not find the function');
}

export function mensajeDeCierre(err: unknown): string {
  if (esFuncionInexistente(err)) {
    return 'Falta aplicar la migración 139 en la base de datos: todavía no existe la función que registra la reunión.';
  }

  return getErrorMessage(err, 'No se pudo registrar cómo fue la reunión');
}

/**
 * Cierra una cita: deja constancia de si el contacto se conecto, guarda la
 * minuta y crea el seguimiento que salga de la reunion.
 *
 * ## Por que el orden importa
 *
 * Primero la cita. Si algo falla despues -la nota, una tarea- el cierre ya
 * quedo registrado y no se vuelve a pedir; al reves, un fallo al cerrar
 * dejaria notas y tareas colgando de una reunion que el sistema sigue
 * considerando sin registrar.
 */
export async function cerrarCita(
  userId: string,
  cita: AgendaAppointment,
  cierre: CierreDeCita,
): Promise<ResultadoDeCierre> {
  const minuta = (cierre.outcomeNotes ?? '').trim();

  const fila = await recordMyAppointmentOutcomeRow(
    cierre.appointmentId,
    cierre.attended,
    minuta || undefined,
  );

  let notaCreada = false;
  if (cierre.tambienComoNotaDelLead && minuta && cita.leadId) {
    await createLeadNote(cita.leadId, userId, minuta);
    notaCreada = true;
  }

  const tareas = (cierre.tareas ?? []).filter((tarea) => tarea.title.trim().length > 0);
  for (const tarea of tareas) {
    await createTaskRow({
      title: tarea.title.trim(),
      // Deja dicho de donde sale, que es lo que se pregunta al verla suelta
      // en la lista de tareas dos semanas despues.
      description: `Seguimiento de la reunión con ${cita.leadName}`,
      lead_id: cita.leadId ?? null,
      lead_list_ids: [],
      due_date: tarea.dueDateIso || null,
      status: 'pendiente',
      user_id: userId,
      created_at: new Date().toISOString(),
    });
  }

  return {
    cita: {
      id: fila.id,
      status: fila.status,
      outcomeRecordedAt: fila.outcome_recorded_at || undefined,
    },
    notaCreada,
    tareasCreadas: tareas.length,
  };
}
