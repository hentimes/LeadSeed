import {
  fetchPlaybookRunRows,
  fetchPlaybookRunRow,
  fetchPlaybookRunItemRows,
  updatePlaybookRunItemRow,
  fetchPlaybookRunNoteRows,
  insertPlaybookRunNoteRow,
  callStartMyPlaybookRun,
  callFinishMyPlaybookRun,
  type PlaybookRunRow,
  type PlaybookRunItemRow,
  type PlaybookRunNoteRow,
} from '../repositories/playbookRunsRepository';
import type {
  PlaybookAnswerType,
  PlaybookIntentRole,
  PlaybookRun,
  PlaybookRunItem,
  PlaybookRunItemState,
  PlaybookRunNote,
  PlaybookRunStatus,
  PlaybookSelection,
} from '../types';
import { getErrorMessage } from '../utils/errorMessage';
import { esDuplicado, esFuncionInexistente } from '../utils/postgrestErrors';

function aRecorrido(row: PlaybookRunRow): PlaybookRun {
  return {
    id: row.id,
    playbookId: row.playbook_id,
    playbookName: row.playbooks?.[0]?.name,
    leadId: row.lead_id,
    leadName: row.leads?.[0]?.name || undefined,
    originAppointmentId: row.origin_appointment_id || undefined,
    status: row.status as PlaybookRunStatus,
    abandonNote: row.abandon_note || undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at || undefined,
  };
}

function aItem(row: PlaybookRunItemRow): PlaybookRunItem {
  return {
    id: row.id,
    runId: row.run_id,
    position: row.position,
    title: row.title,
    question: row.question,
    support: row.support || undefined,
    sectionTitle: row.section_title,
    sectionPosition: row.section_position,
    state: row.state as PlaybookRunItemState,
    note: row.note || undefined,
    answeredAt: row.answered_at || undefined,
    answerType: (row.answer_type as PlaybookAnswerType) || 'texto',
    intentRole: (row.intent_role as PlaybookIntentRole) || undefined,
    options: row.options ?? [],
    sourceRunItemIds: row.source_run_item_ids ?? [],
    selections: row.selections ?? [],
    /*
     * `?? undefined` y NO `|| undefined`: la cadena vacia significa "la
     * persona borro la frase a proposito" y tiene que sobrevivir. Con `||` se
     * convertiria en undefined, que significa "usa la derivada", y la frase
     * seria imposible de borrar.
     */
    checkpointText: row.checkpoint_text ?? undefined,
  };
}

function aNota(row: PlaybookRunNoteRow): PlaybookRunNote {
  return {
    id: row.id,
    runId: row.run_id,
    kind: row.kind === 'cierre' ? 'cierre' : 'nota',
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function fetchRunsForLead(leadId: string): Promise<PlaybookRun[]> {
  const filas = await fetchPlaybookRunRows({ leadId });
  return filas.map(aRecorrido);
}

/** Todos los recorridos del usuario. La RLS ya acota a los suyos. */
export async function fetchAllRuns(): Promise<PlaybookRun[]> {
  const filas = await fetchPlaybookRunRows({});
  return filas.map(aRecorrido);
}

export async function fetchRun(runId: string): Promise<PlaybookRun | null> {
  const fila = await fetchPlaybookRunRow(runId);
  return fila ? aRecorrido(fila) : null;
}

export async function fetchRunItems(runId: string): Promise<PlaybookRunItem[]> {
  const filas = await fetchPlaybookRunItemRows(runId);
  return filas.map(aItem);
}

export async function fetchRunNotes(runId: string): Promise<PlaybookRunNote[]> {
  const filas = await fetchPlaybookRunNoteRows(runId);
  return filas.map(aNota);
}

export async function agregarNota(runId: string, body: string): Promise<PlaybookRunNote> {
  const texto = body.trim();
  if (!texto) throw new Error('La nota está vacía');
  return aNota(await insertPlaybookRunNoteRow(runId, texto));
}

/**
 * Marca un punto del guion.
 *
 * Devuelve la fila que respondio el servidor y no la que se pidio: trae el
 * `answered_at` que puso el trigger, que el cliente no puede adivinar -no se
 * sella al corregir `hecho` por `no_aplica`, porque el punto ya estaba
 * resuelto-.
 */
export async function marcarItem(
  itemId: string,
  state: PlaybookRunItemState,
  note?: string | null,
): Promise<PlaybookRunItem> {
  const payload: { state: PlaybookRunItemState; note?: string | null } = { state };
  if (note !== undefined) payload.note = note?.trim() || null;

  return aItem(await updatePlaybookRunItemRow(itemId, payload));
}

export async function guardarNotaDeItem(itemId: string, note: string): Promise<PlaybookRunItem> {
  return aItem(await updatePlaybookRunItemRow(itemId, { note: note.trim() || null }));
}

/**
 * Guarda lo respondido por opciones.
 *
 * Nunca manda `state`: responder no marca el punto como hecho. `hecho`
 * significa "ya lo converse" y sella `answered_at`, que es la semilla de las
 * futuras sesiones; un toque de mas ensuciaria el unico dato del que se puede
 * derivar una.
 */
export async function guardarSelecciones(
  itemId: string,
  selections: PlaybookSelection[],
): Promise<PlaybookRunItem> {
  return aItem(await updatePlaybookRunItemRow(itemId, { selections }));
}

/**
 * Guarda la frase de confirmacion editada a mano.
 *
 * `null` devuelve el punto a "usa la derivada"; una cadena vacia es una frase
 * borrada a proposito, que no es lo mismo.
 */
export async function guardarTextoDeCheckpoint(
  itemId: string,
  texto: string | null,
): Promise<PlaybookRunItem> {
  return aItem(await updatePlaybookRunItemRow(itemId, { checkpoint_text: texto }));
}

export interface InicioDeRecorrido {
  playbookId: string;
  leadId: string;
  /** La cita desde la que se arranco, si se arranco desde una. */
  originAppointmentId?: string | null;
}

/**
 * Empieza un recorrido y devuelve su id.
 *
 * El recorrido y sus items nacen juntos, en una sola transaccion del servidor:
 * uno sin los otros no se podria reparar, porque el indice unico impediria
 * crear otro para el mismo lead y playbook.
 */
export async function iniciarRecorrido(inicio: InicioDeRecorrido): Promise<string> {
  return callStartMyPlaybookRun({
    playbookId: inicio.playbookId,
    leadId: inicio.leadId,
    originAppointmentId: inicio.originAppointmentId ?? null,
  });
}

export interface CierreDeRecorrido {
  runId: string;
  status: Exclude<PlaybookRunStatus, 'en_curso'>;
  /** Nota de cierre. Al abandonar se guarda ademas como motivo. */
  nota?: string;
  /**
   * Copia la nota tambien a la ficha del lead.
   *
   * Misma decision que en el cierre de una cita: son dos sitios con dueños
   * distintos, y casi siempre -pero no siempre- se quieren los dos.
   */
  tambienComoNotaDelLead?: boolean;
}

export interface ResultadoDeCierreDeRecorrido {
  recorrido: { id: string; status: PlaybookRunStatus; endedAt: string };
  notaCreada: boolean;
}

export async function cerrarRecorrido(
  cierre: CierreDeRecorrido,
): Promise<ResultadoDeCierreDeRecorrido> {
  const nota = (cierre.nota ?? '').trim();

  const fila = await callFinishMyPlaybookRun({
    runId: cierre.runId,
    status: cierre.status,
    note: nota || null,
    alsoLeadNote: !!cierre.tambienComoNotaDelLead && !!nota,
  });

  return {
    recorrido: {
      id: fila.run_id,
      status: fila.status as PlaybookRunStatus,
      endedAt: fila.ended_at,
    },
    notaCreada: fila.note_created,
  };
}

const FALTA_MIGRACION =
  'Falta aplicar la migración pendiente en la base de datos: todavía no existe la función de guiones.';

/**
 * El choque del indice unico NO es un error: es la regla de negocio.
 *
 * La RPC deja hablar al indice a proposito, porque entre comprobar y crear
 * cabe otro toque. Crudo, el usuario leeria "duplicate key value violates
 * unique constraint", que suena a fallo del programa cuando lo que ocurre es
 * que ese lead ya esta recorriendo este guion y hay que continuarlo.
 */
export function mensajeDeInicio(err: unknown): string {
  if (esFuncionInexistente(err)) return FALTA_MIGRACION;
  if (esDuplicado(err)) return 'Ya hay un recorrido en curso para este lead con este guion.';

  return getErrorMessage(err, 'No se pudo empezar el guion');
}

export function mensajeDeCierreDeRecorrido(err: unknown): string {
  if (esFuncionInexistente(err)) return FALTA_MIGRACION;
  return getErrorMessage(err, 'No se pudo cerrar el guion');
}
