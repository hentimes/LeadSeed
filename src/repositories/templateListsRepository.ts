import { supabase } from '../lib/supabaseClient';
import type { TemplateType } from './templatesRepository';

export interface TemplateListRow {
  id: number;
  name: string;
  color: string | null;
  type: TemplateType;
  created_at: string;
}

const TEMPLATE_LISTS_TABLE = 'template_lists';

export async function fetchTemplateListRows(userId: string, type: TemplateType): Promise<TemplateListRow[]> {
  const { data, error } = await supabase
    .from(TEMPLATE_LISTS_TABLE)
    .select('id, name, color, type, created_at')
    .eq('user_id', userId)
    .eq('type', type)
    .order('name');

  if (error || !data) {
    return [];
  }

  return data as TemplateListRow[];
}

export async function updateTemplateList(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(TEMPLATE_LISTS_TABLE).update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function createTemplateList(payload: Record<string, unknown>): Promise<number> {
  const { data, error } = await supabase.from(TEMPLATE_LISTS_TABLE).insert(payload).select('id').single();
  if (error || !data) {
    throw error || new Error('No se pudo crear la categoría');
  }

  return data.id as number;
}

export async function deleteTemplateListRow(id: number): Promise<void> {
  const { error } = await supabase.from(TEMPLATE_LISTS_TABLE).delete().eq('id', id);
  if (error) {
    throw error;
  }
}
