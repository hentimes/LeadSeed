import { MAX_LIST_DESCRIPTION, MAX_LIST_NAME, type LeadList } from '../types';
import {
  createLeadList,
  deleteLeadListRow,
  fetchLeadListRows,
  type LeadListRow,
  updateLeadList,
  updateLeadListsColor,
} from '../repositories/listsRepository';
import { STATE } from '../config/colors';

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

/**
 * Recorta el nombre al limite antes de enviarlo.
 *
 * El nombre solo tenia el `maxLength` del formulario, que se salta cualquier
 * camino que no sea ese formulario -una importacion, la API, un script-. Desde
 * la migracion 129 la base tambien lo limita, asi que sin este recorte un
 * nombre largo fallaria con un error de Postgres que no le dice nada a nadie.
 */
function normalizarNombre(valor: string): string {
  return valor.trim().slice(0, MAX_LIST_NAME);
}

export async function fetchLeadLists(userId: string): Promise<LeadList[]> {
  return (await fetchLeadListRows(userId)).map(mapRowToLeadList);
}

export async function saveLeadList(userId: string, list: LeadList): Promise<number> {
  if (list.id) {
    await updateLeadList(list.id, {
      name: normalizarNombre(list.name),
      color: list.color,
      description: normalizarDescripcion(list.description),
      updated_at: new Date().toISOString(),
    });
    return list.id;
  }

  return createLeadList({
    user_id: userId,
    name: normalizarNombre(list.name),
    color: list.color,
    description: normalizarDescripcion(list.description),
  });
}

/** Pinta varias listas del mismo color. Ver `updateLeadListsColor`. */
export async function updateListsColor(ids: number[], color: string): Promise<void> {
  await updateLeadListsColor(ids, color);
}

export async function deleteLeadList(id: number): Promise<void> {
  await deleteLeadListRow(id);
}
