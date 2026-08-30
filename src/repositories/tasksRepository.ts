import { supabase } from '../lib/supabaseClient';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  is_important: boolean;
  section_id: string | null;
  color: string | null;
  lead_id: string | null;
  lead_list_ids: number[] | null;
  created_at: string;
  user_id: string;
}

const TASK_SELECT = 'id, title, description, status, due_date, lead_id, lead_list_ids, created_at, user_id, is_important, section_id, color';

export async function fetchTaskRowsByUser(userId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', userId)
    .order('due_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as TaskRow[];
}

export async function createTaskRow(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('tasks').insert(payload);
  if (error) {
    throw error;
  }
}

export async function updateTaskRow(id: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('tasks').update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function deleteTaskRow(id: string | number): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
