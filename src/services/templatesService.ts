import type { CallTemplate, EmailTemplate, Lead, WhatsAppTemplate } from '../types';
import {
  createTemplate,
  deleteTemplateRow,
  fetchLeadAssignmentRows,
  fetchTemplateRowsByList,
  fetchTemplateRowsByType,
  type TemplateRow,
  type TemplateType,
  updateTemplate,
} from '../repositories/templatesRepository';

export type { TemplateType } from '../repositories/templatesRepository';

export type GenericTemplate = WhatsAppTemplate | EmailTemplate | CallTemplate;

export const mapTemplateRowToFrontend = (row: TemplateRow) => ({
  id: row.id,
  nombre: row.name,
  contenido: row.content,
  asunto: row.subject,
  isHtml: row.is_html || false,
  templateListIds: row.template_list_ids || [],
  leadIds: row.lead_ids || [],
  leadListIds: row.lead_list_ids || [],
  createdAt: row.created_at,
});

export const mapTemplateToDb = (template: GenericTemplate, type: TemplateType, userId: string) => ({
  user_id: userId,
  type,
  name: template.nombre,
  content: template.contenido || '',
  subject: 'asunto' in template ? template.asunto || null : null,
  is_html: 'isHtml' in template ? template.isHtml || false : false,
  template_list_ids: template.templateListIds || [],
  lead_ids: template.leadIds || [],
  lead_list_ids: template.leadListIds || [],
  updated_at: new Date().toISOString(),
});

export async function fetchTemplatesByType<T>(type: TemplateType): Promise<T[]> {
  return (await fetchTemplateRowsByType(type)).map(mapTemplateRowToFrontend) as T[];
}

export async function fetchTemplatesByList<T>(type: TemplateType, listId: number): Promise<T[]> {
  return (await fetchTemplateRowsByList(type, listId)).map(mapTemplateRowToFrontend) as T[];
}

export async function saveTemplateForUser(userId: string, type: TemplateType, template: GenericTemplate): Promise<string> {
  const payload = mapTemplateToDb(template, type, userId);

  if (template.id && typeof template.id === 'string') {
    await updateTemplate(template.id, payload);
    return template.id;
  }

  return createTemplate({
    ...payload,
    created_at: new Date().toISOString(),
  });
}

export async function deleteTemplate(id: string | number): Promise<void> {
  await deleteTemplateRow(id);
}

export async function getAssignedLeadIds(template: Pick<GenericTemplate, 'leadIds' | 'leadListIds'>, userId: string): Promise<{
  directIds: string[];
  fromListsIds: string[];
  allIds: string[];
}> {
  const directIds = template.leadIds || [];
  const listLeadIds: string[] = [];

  if (template.leadListIds && template.leadListIds.length > 0) {
    const leads = await fetchLeadAssignmentRows(userId);
    for (const lead of leads) {
      if (lead.lista_ids && lead.lista_ids.some((listId) => template.leadListIds.includes(listId))) {
        if (!directIds.includes(lead.id)) {
          listLeadIds.push(lead.id);
        }
      }
    }
  }

  return {
    directIds,
    fromListsIds: listLeadIds,
    allIds: [...new Set([...directIds, ...listLeadIds])],
  };
}
