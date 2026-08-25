import { MAX_LIST_DESCRIPTION, type LeadList } from '../types';
import {
  createLeadList,
  deleteLeadListRow,
  fetchLeadListRows,
  type LeadListRow,
  updateLeadList,
} from '../repositories/listsRepository';
import { STATE } from '../design/colors';

const mapRowToLeadList = (row: LeadListRow): LeadList => ({
  id: row.id,
  name: row.name,
  color: row.color || STATE.info,
  createdAt: row.created_at,
  description: row.description || undefined,
});

/**
 * Recorta la descripcion al limite antes de enviarla.
 *
 * La base tiene una restriccion de 25 caracteres, y un texto mas largo la haria
 * fallar con un error de Postgres que no dice nada util al usuario. Vacio se
 * guarda como null y no como cadena vacia: "sin descripcion" es la ausencia del
 * dato, no un dato vacio.
 */
function normalizarDescripcion(valor: string | undefined): string | null {
  const limpia = (valor || '').trim().slice(0, MAX_LIST_DESCRIPTION);
  return limpia || null;
}

export async function fetchLeadLists(userId: string): Promise<LeadList[]> {
  return (await fetchLeadListRows(userId)).map(mapRowToLeadList);
}

export async function saveLeadList(userId: string, list: LeadList): Promise<number> {
  if (list.id) {
    await updateLeadList(list.id, {
      name: list.name,
      color: list.color,
      description: normalizarDescripcion(list.description),
      updated_at: new Date().toISOString(),
    });
    return list.id;
  }

  return createLeadList({
    user_id: userId,
    name: list.name,
    color: list.color,
    description: normalizarDescripcion(list.description),
  });
}

export async function deleteLeadList(id: number): Promise<void> {
  await deleteLeadListRow(id);
}
