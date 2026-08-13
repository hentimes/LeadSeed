import type { LeadList } from '../types';
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
});

export async function fetchLeadLists(userId: string): Promise<LeadList[]> {
  return (await fetchLeadListRows(userId)).map(mapRowToLeadList);
}

export async function saveLeadList(userId: string, list: LeadList): Promise<number> {
  if (list.id) {
    await updateLeadList(list.id, {
      name: list.name,
      color: list.color,
      updated_at: new Date().toISOString(),
    });
    return list.id;
  }

  return createLeadList({
    user_id: userId,
    name: list.name,
    color: list.color,
  });
}

export async function deleteLeadList(id: number): Promise<void> {
  await deleteLeadListRow(id);
}
