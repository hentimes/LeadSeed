import { supabase } from '../lib/supabaseClient';
import type { Subtask } from '../types';

interface SubtaskRow {
  id: string;
  task_id: string;
  titulo: string;
  hecha: boolean;
  position: number;
}

const SELECT = 'id, task_id, titulo, hecha, position';

function aDominio(fila: SubtaskRow): Subtask {
  return {
    id: fila.id,
    taskId: fila.task_id,
    titulo: fila.titulo,
    hecha: fila.hecha,
    position: fila.position,
  };
}

export async function fetchSubtasks(taskId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('task_subtasks')
    .select(SELECT)
    .eq('task_id', taskId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((fila) => aDominio(fila as SubtaskRow));
}

export async function createSubtask(taskId: string, titulo: string, position: number): Promise<void> {
  const { error } = await supabase
    .from('task_subtasks')
    .insert({ task_id: taskId, titulo, position });

  if (error) throw new Error(error.message);
}

export async function setSubtaskDone(id: string, hecha: boolean): Promise<void> {
  const { error } = await supabase.from('task_subtasks').update({ hecha }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from('task_subtasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
