import { supabase } from '../lib/supabaseClient';

/**
 * LA DEFINICION de los playbooks: el proceso, sus fases y sus items.
 *
 * La ejecucion -recorridos, su avance y sus notas- vive en
 * `playbookRunsRepository`. Estan separados porque son dos ciclos de vida
 * distintos: la definicion se edita, la ejecucion se registra y no se toca.
 *
 * ## `user_id` no se manda desde aqui
 *
 * En `playbooks` lo comprueba la RLS contra `auth.uid()`. Las hijas no tienen
 * columna de dueño: su politica pregunta a la tabla madre con un `exists`
 * (migracion 148). Es al reves que `message_flows`, donde un trigger copia el
 * dueño a la hija; el motivo del cambio esta escrito en la cabecera de la 148.
 */

export interface PlaybookRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlaybookSectionRow {
  id: string;
  playbook_id: string;
  position: number;
  title: string;
}

export interface PlaybookItemRow {
  id: string;
  section_id: string;
  position: number;
  title: string;
  question: string;
  support: string | null;
  answer_type: string;
  intent_role: string | null;
  options: { id: string; label: string }[] | null;
  source_item_ids: string[] | null;
}

/*
 * Las columnas en UNA constante y no repetidas en cada `select`.
 *
 * Estaban escritas a mano en dos sitios, y olvidar una columna nueva en uno de
 * ellos no da error: devuelve la fila sin ese campo y el dato desaparece de la
 * pantalla sin que nada falle.
 */
const ITEM_COLS =
  'id, section_id, position, title, question, support, answer_type, intent_role, options, source_item_ids';

const PLAYBOOKS = 'playbooks';
const SECTIONS = 'playbook_sections';
const ITEMS = 'playbook_items';

export async function fetchPlaybookRows(soloActivos = false): Promise<PlaybookRow[]> {
  let q = supabase
    .from(PLAYBOOKS)
    .select('id, name, description, is_active, created_at')
    .order('created_at', { ascending: false });

  if (soloActivos) q = q.eq('is_active', true);

  const { data, error } = await q;
  if (error || !data) return [];
  return data as PlaybookRow[];
}

export async function fetchPlaybookSectionRows(playbookId: string): Promise<PlaybookSectionRow[]> {
  const { data, error } = await supabase
    .from(SECTIONS)
    .select('id, playbook_id, position, title')
    .eq('playbook_id', playbookId)
    .order('position');

  if (error || !data) return [];
  return data as PlaybookSectionRow[];
}

/**
 * Los items de varias fases de una vez.
 *
 * Con la lista vacia se corta antes de llamar: `in()` sin valores devuelve
 * todo, que aqui seria los items de otros playbooks del mismo usuario.
 */
export async function fetchPlaybookItemRows(sectionIds: string[]): Promise<PlaybookItemRow[]> {
  if (sectionIds.length === 0) return [];

  const { data, error } = await supabase
    .from(ITEMS)
    .select(ITEM_COLS)
    .in('section_id', sectionIds)
    .order('position');

  if (error || !data) return [];
  return data as PlaybookItemRow[];
}

export async function insertPlaybookRow(payload: {
  user_id: string;
  name: string;
  description: string | null;
}): Promise<string> {
  const { data, error } = await supabase.from(PLAYBOOKS).insert(payload).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updatePlaybookRow(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from(PLAYBOOKS)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fases e items se guardan con UN upsert por tabla, nunca fila a fila.
 *
 * La restriccion de posicion es `deferrable initially deferred`, asi que
 * reordenar no necesita posiciones intermedias... pero solo dentro de una
 * transaccion, y PostgREST no da transacciones de varias sentencias. Un unico
 * upsert por tabla SI es una sentencia: el diferimiento aplica y el
 * intercambio de dos posiciones no choca consigo mismo. Emitir N updates
 * sueltos es lo que revienta, y solo al reordenar de verdad -en una prueba de
 * tres items no se nota-.
 */
export async function upsertPlaybookSectionRows(
  rows: Record<string, unknown>[],
): Promise<PlaybookSectionRow[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from(SECTIONS)
    .upsert(rows)
    .select('id, playbook_id, position, title');

  if (error) throw error;
  return (data ?? []) as PlaybookSectionRow[];
}

export async function upsertPlaybookItemRows(
  rows: Record<string, unknown>[],
): Promise<PlaybookItemRow[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from(ITEMS)
    .upsert(rows)
    .select(ITEM_COLS);

  if (error) throw error;
  return (data ?? []) as PlaybookItemRow[];
}

export async function deletePlaybookSectionRow(id: string): Promise<void> {
  const { error } = await supabase.from(SECTIONS).delete().eq('id', id);
  if (error) throw error;
}

export async function deletePlaybookItemRow(id: string): Promise<void> {
  const { error } = await supabase.from(ITEMS).delete().eq('id', id);
  if (error) throw error;
}
