import { supabase } from '../lib/supabaseClient';
import type { TaskAttachment, TaskNote } from '../types';

const BUCKET = 'task-files';

/** Cuanto vale una URL firmada, en segundos. */
const VIGENCIA_FIRMA = 60 * 60;

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

export async function fetchTaskNotes(taskId: string): Promise<TaskNote[]> {
  const { data, error } = await supabase
    .from('task_notes')
    .select('id, task_id, cuerpo, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((fila) => ({
    id: fila.id as string,
    taskId: fila.task_id as string,
    cuerpo: fila.cuerpo as string,
    createdAt: fila.created_at as string,
  }));
}

export async function createTaskNote(taskId: string, cuerpo: string): Promise<void> {
  const { error } = await supabase.from('task_notes').insert({ task_id: taskId, cuerpo });
  if (error) throw new Error(error.message);
}

export async function deleteTaskNote(id: string): Promise<void> {
  const { error } = await supabase.from('task_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Adjuntos
// ---------------------------------------------------------------------------

/**
 * Los adjuntos, con su URL ya firmada.
 *
 * El bucket es privado -a diferencia del del foro-, asi que no hay URL publica
 * que guardar: se pide una firmada en cada carga. Es una llamada mas, y es el
 * precio de que un archivo de una tarea no quede accesible para cualquiera que
 * tenga el enlace.
 */
export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('id, task_id, storage_path, nombre, mime, bytes, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const filas = data ?? [];
  if (filas.length === 0) return [];

  const rutas = filas.map((fila) => fila.storage_path as string);
  const { data: firmadas } = await supabase.storage.from(BUCKET).createSignedUrls(rutas, VIGENCIA_FIRMA);

  const porRuta = new Map((firmadas ?? []).map((item) => [item.path, item.signedUrl]));

  return filas.map((fila) => ({
    id: fila.id as string,
    taskId: fila.task_id as string,
    storagePath: fila.storage_path as string,
    nombre: fila.nombre as string,
    mime: fila.mime as string,
    bytes: fila.bytes as number,
    createdAt: fila.created_at as string,
    url: porRuta.get(fila.storage_path as string) ?? null,
  }));
}

export async function uploadTaskAttachment(
  userId: string,
  taskId: string,
  archivo: File,
): Promise<void> {
  const extension = archivo.name.split('.').pop() || 'bin';
  const ruta = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: errorDeSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

  if (errorDeSubida) throw new Error(errorDeSubida.message);

  const { error } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    storage_path: ruta,
    nombre: archivo.name,
    mime: archivo.type,
    bytes: archivo.size,
  });

  if (error) {
    /*
     * Si la fila falla, el archivo ya subido se borra. Sin esto quedaria
     * ocupando cuota para siempre, sin nada que lo referencie ni forma de
     * encontrarlo desde la aplicacion.
     */
    await supabase.storage.from(BUCKET).remove([ruta]);
    throw new Error(error.message);
  }
}

export async function deleteTaskAttachment(id: string, storagePath: string): Promise<void> {
  const { error } = await supabase.from('task_attachments').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // El archivo se borra despues de la fila: si el orden fuera al reves y la
  // fila fallara, quedaria una tarjeta apuntando a un archivo que ya no existe.
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
