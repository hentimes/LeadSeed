import { supabase } from '../lib/supabaseClient';

export interface LeadListRow {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
  description: string | null;
}

const LEAD_LISTS_TABLE = 'lead_lists';

export async function fetchLeadListRows(userId: string): Promise<LeadListRow[]> {
  const { data, error } = await supabase
    .from(LEAD_LISTS_TABLE)
    .select('id, name, color, created_at, description')
    .eq('user_id', userId)
    .order('name');

  if (error || !data) {
    return [];
  }

  return data as LeadListRow[];
}

/**
 * Cambia el color de varias listas de una vez.
 *
 * Una sola sentencia y no un `Promise.all` de `saveLeadList`: esa version haria
 * N viajes, reenviaria el nombre y la descripcion de cada lista sin necesidad, y
 * podria dejar la mitad cambiada si una fallara a mitad de camino.
 */
export async function updateLeadListsColor(ids: number[], color: string): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase.from(LEAD_LISTS_TABLE).update({ color }).in('id', ids);
  if (error) throw error;
}

export async function updateLeadList(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(LEAD_LISTS_TABLE).update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function createLeadList(payload: Record<string, unknown>): Promise<number> {
  const { data, error } = await supabase.from(LEAD_LISTS_TABLE).insert(payload).select('id').single();
  if (error || !data) {
    throw error || new Error('No se pudo crear la lista');
  }

  return data.id as number;
}

export async function deleteLeadListRow(id: number): Promise<void> {
  const { error } = await supabase.from(LEAD_LISTS_TABLE).delete().eq('id', id);
  if (error) {
    throw error;
  }
}
