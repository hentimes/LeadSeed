import {
  createTemplateList,
  deleteTemplateListRow,
  fetchTemplateListRows,
  updateTemplateList,
} from '../repositories/templateListsRepository';
import type { TemplateType } from '../repositories/templatesRepository';

export interface TemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export async function fetchTemplateLists(userId: string, type: TemplateType): Promise<TemplateList[]> {
  const rows = await fetchTemplateListRows(userId, type);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color || '#64748b',
    createdAt: r.created_at,
  }));
}

export async function saveTemplateList(userId: string, type: TemplateType, list: TemplateList): Promise<number> {
  const payload = {
    user_id: userId,
    name: list.name,
    color: list.color,
    type,
    updated_at: new Date().toISOString(),
  };

  if (list.id) {
    await updateTemplateList(list.id, payload);
    return list.id;
  }

  return createTemplateList({
    ...payload,
    created_at: new Date().toISOString(),
  });
}

export async function deleteTemplateList(id: number): Promise<void> {
  await deleteTemplateListRow(id);
}
