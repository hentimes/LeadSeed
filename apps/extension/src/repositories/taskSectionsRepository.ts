import { supabase } from '../lib/supabaseClient';

export interface TaskSectionRow {
  id: string;
  name: string;
  position: number;
}

const SELECT = 'id, name, position';

export async function fetchTaskSections(userId: string): Promise<TaskSectionRow[]> {
  const { data, error } = await supabase
    .from('task_sections')
    .select(SELECT)
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskSectionRow[];
}

export async function createTaskSection(
  userId: string,
  name: string,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from('task_sections')
    .insert({ user_id: userId, name, position });

  if (error) throw new Error(error.message);
}

export async function renameTaskSection(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('task_sections').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Borra la columna, no su contenido.
 *
 * Las tareas que tenia adentro quedan con `section_id` en nulo por la regla
 * `on delete set null` de la migracion 132, o sea que caen a "Sin seccion" en
 * vez de desaparecer. Vale la pena decirlo aca porque desde el codigo no se ve:
 * el borrado parece que se lleva todo por delante.
 */
export async function deleteTaskSection(id: string): Promise<void> {
  const { error } = await supabase.from('task_sections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moveTaskToSection(taskId: string, sectionId: string | null): Promise<void> {
  const { error } = await supabase.from('tasks').update({ section_id: sectionId }).eq('id', taskId);
  if (error) throw new Error(error.message);
}
