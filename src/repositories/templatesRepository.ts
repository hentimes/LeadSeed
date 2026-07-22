import { supabase } from '../lib/supabaseClient';
import type { Lead } from '../types';

export type TemplateType = 'whatsapp' | 'email' | 'call';

export interface TemplateRow {
  id: string;
  name: string;
  content: string;
  subject: string | null;
  is_html: boolean | null;
  template_list_ids: number[] | null;
  lead_ids: string[] | null;
  lead_list_ids: number[] | null;
  created_at: string;
}

export interface AssignedLeadRow {
  id: string;
  lista_ids: number[] | null;
}

const TEMPLATE_SELECT =
  'id, name, content, subject, is_html, template_list_ids, lead_ids, lead_list_ids, created_at';

export async function fetchTemplateRowsByType(type: TemplateType): Promise<TemplateRow[]> {
  const { data, error } = await supabase.from('templates').select(TEMPLATE_SELECT).eq('type', type).order('name');
  if (error || !data) {
    if (error) {
      console.error('fetchTemplateRowsByType failed', error);
    }
    return [];
  }

  return data as TemplateRow[];
}

export async function fetchTemplateRowsByUserId(userId: string): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from('templates')
    .select(TEMPLATE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw error || new Error('No se pudieron cargar las plantillas del usuario');
  }

  return data as TemplateRow[];
}

export async function fetchTemplateRowsByList(type: TemplateType, listId: number): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from('templates')
    .select(TEMPLATE_SELECT)
    .eq('type', type)
    .contains('template_list_ids', [listId])
    .order('name');

  if (error || !data) {
    if (error) {
      console.error('fetchTemplateRowsByList failed', error);
    }
    return [];
  }

  return data as TemplateRow[];
}

export async function updateTemplate(id: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('templates').update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function createTemplate(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.from('templates').insert(payload).select('id').single();
  if (error || !data) {
    throw error || new Error('No se pudo crear la plantilla');
  }

  return data.id as string;
}

export async function deleteTemplateRow(id: string | number): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function fetchLeadAssignmentRows(userId: string): Promise<Array<Pick<Lead, 'id'> & AssignedLeadRow>> {
  const { data, error } = await supabase.from('leads').select('id, lista_ids').eq('user_id', userId);
  if (error) {
    console.error('fetchLeadAssignmentRows failed', error);
    return [];
  }
  return (data ?? []) as Array<Pick<Lead, 'id'> & AssignedLeadRow>;
}
