import { supabase } from '../lib/supabaseClient';

/**
 * LA EJECUCION: recorridos, su avance y sus notas.
 *
 * ## Aqui no se inserta
 *
 * No hay `insertPlaybookRunRow` ni `insertPlaybookRunItemRow`, y no es un
 * olvido: la migracion 148 no le da politica de INSERT a esas dos tablas. Un
 * recorrido y sus items solo nacen dentro de `start_my_playbook_run`, que es
 * `security definer`. Si se pudieran insertar desde aqui, la RPC seria un
 * camino opcional y quedaria abierta la puerta a un recorrido sin items: roto
 * y, por el indice unico parcial, irreemplazable.
 */

export interface PlaybookRunRow {
  id: string;
  playbook_id: string;
  lead_id: string;
  origin_appointment_id: string | null;
  status: string;
  abandon_note: string | null;
  started_at: string;
  ended_at: string | null;
  /**
   * Vienen de los join. Supabase los tipa como arreglo aunque la relacion sea
   * de uno, asi que se declaran igual y el servicio toma el primero.
   */
  playbooks?: Array<{ name: string }> | null;
  leads?: Array<{ name: string | null }> | null;
}

export interface PlaybookRunItemRow {
  id: string;
  run_id: string;
  position: number;
  title: string;
  question: string;
  support: string | null;
  section_title: string;
  section_position: number;
  state: string;
  note: string | null;
  answered_at: string | null;
  answer_type: string;
  intent_role: string | null;
  options: { id: string; label: string }[] | null;
  source_run_item_ids: string[] | null;
  selections: { id: string; value: string; label?: string }[] | null;
  checkpoint_text: string | null;
}

export interface PlaybookRunNoteRow {
  id: string;
  run_id: string;
  kind: string;
  body: string;
  created_at: string;
}

export interface FinishPlaybookRunRow {
  run_id: string;
  status: string;
  ended_at: string;
  note_created: boolean;
}

const RUNS = 'playbook_runs';
const RUN_ITEMS = 'playbook_run_items';
const RUN_NOTES = 'playbook_run_notes';

const RUN_COLS =
  'id, playbook_id, lead_id, origin_appointment_id, status, abandon_note, started_at, ended_at, playbooks(name), leads(name)';

/*
 * Olvidar una columna aqui NO da error: el servidor devuelve la fila sin ese
 * campo, y como el hook SUSTITUYE el item por lo devuelto, el dato desaparece
 * de la pantalla hasta recargar. Marcar un punto como hecho borraria las
 * selecciones. Por eso hay un test que comprueba la ida y vuelta.
 *
 * Va en UNA cadena literal, sin concatenar y sin partir: Supabase analiza este
 * texto en tiempo de tipos para saber que devuelve el `select`, y troceado
 * pierde esa inferencia -las filas pasan a `GenericStringError`-. La forma fea
 * es justo la que conserva la comprobacion.
 */
const RUN_ITEM_COLS =
  'id, run_id, position, title, question, support, section_title, section_position, state, note, answered_at, answer_type, intent_role, options, source_run_item_ids, selections, checkpoint_text';

export async function fetchPlaybookRunRows(filtro: {
  leadId?: string;
  status?: string;
}): Promise<PlaybookRunRow[]> {
  let q = supabase.from(RUNS).select(RUN_COLS).order('started_at', { ascending: false });

  if (filtro.leadId) q = q.eq('lead_id', filtro.leadId);
  if (filtro.status) q = q.eq('status', filtro.status);

  const { data, error } = await q;
  if (error || !data) return [];
  return data as unknown as PlaybookRunRow[];
}

export async function fetchPlaybookRunRow(runId: string): Promise<PlaybookRunRow | null> {
  const { data, error } = await supabase.from(RUNS).select(RUN_COLS).eq('id', runId).maybeSingle();
  if (error || !data) return null;
  return data as unknown as PlaybookRunRow;
}

export async function fetchPlaybookRunItemRows(runId: string): Promise<PlaybookRunItemRow[]> {
  const { data, error } = await supabase
    .from(RUN_ITEMS)
    .select(RUN_ITEM_COLS)
    .eq('run_id', runId)
    .order('position');

  if (error || !data) return [];
  return data as PlaybookRunItemRow[];
}

/**
 * El payload es estrecho A PROPOSITO: solo lo que una persona responde.
 *
 * Son cuatro campos y no mas: `state`, `note`, `selections` y
 * `checkpoint_text`. Fuera quedan dos clases de columnas, por dos motivos
 * distintos:
 *
 *  - `answered_at` y `updated_at` los sella un trigger. Mandarlos desde aqui
 *    "para que la pantalla vaya mas rapida" rompe el unico dato del que podran
 *    derivarse las sesiones mas adelante.
 *  - La copia historica -la pregunta, las opciones, la fase, la posicion- la
 *    congela otro trigger, y desde la 151 ese trigger enumera lo MUTABLE, asi
 *    que cualquier columna que se anada en el futuro nace protegida. El intento
 *    ni siquiera llegaria a guardarse.
 */
export async function updatePlaybookRunItemRow(
  id: string,
  payload: {
    state?: string;
    note?: string | null;
    selections?: { id: string; value: string; label?: string }[];
    checkpoint_text?: string | null;
  },
): Promise<PlaybookRunItemRow> {
  const { data, error } = await supabase
    .from(RUN_ITEMS)
    .update(payload)
    .eq('id', id)
    .select(RUN_ITEM_COLS)
    .single();

  if (error) throw error;
  return data as PlaybookRunItemRow;
}

export async function fetchPlaybookRunNoteRows(runId: string): Promise<PlaybookRunNoteRow[]> {
  const { data, error } = await supabase
    .from(RUN_NOTES)
    .select('id, run_id, kind, body, created_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as PlaybookRunNoteRow[];
}

export async function insertPlaybookRunNoteRow(
  runId: string,
  body: string,
): Promise<PlaybookRunNoteRow> {
  const { data, error } = await supabase
    .from(RUN_NOTES)
    .insert({ run_id: runId, kind: 'nota', body })
    .select('id, run_id, kind, body, created_at')
    .single();

  if (error) throw error;
  return data as PlaybookRunNoteRow;
}

/** Devuelve un escalar: el id del recorrido creado. */
export async function callStartMyPlaybookRun(args: {
  playbookId: string;
  leadId: string;
  originAppointmentId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('start_my_playbook_run', {
    p_playbook_id: args.playbookId,
    p_lead_id: args.leadId,
    p_origin_appointment_id: args.originAppointmentId || null,
  });
  if (error) throw error;
  return data as string;
}

/** Devuelve `returns table`, asi que llega como arreglo de una fila. */
export async function callFinishMyPlaybookRun(args: {
  runId: string;
  status: 'finalizado' | 'abandonado';
  note?: string | null;
  alsoLeadNote: boolean;
}): Promise<FinishPlaybookRunRow> {
  const { data, error } = await supabase.rpc('finish_my_playbook_run', {
    p_run_id: args.runId,
    p_status: args.status,
    p_note: args.note || null,
    p_also_lead_note: args.alsoLeadNote,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as FinishPlaybookRunRow;
}
