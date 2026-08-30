import { useCallback, useEffect, useState } from 'react';
import {
  createTaskNote,
  deleteTaskAttachment,
  deleteTaskNote,
  fetchTaskAttachments,
  fetchTaskNotes,
  uploadTaskAttachment,
} from '../repositories/taskNotesRepository';
import type { TaskAttachment, TaskNote } from '../types';

/**
 * Las notas y los adjuntos de la tarea abierta.
 *
 * Van juntos en un hook porque se cargan y se descartan a la vez -al cambiar de
 * tarea- y ninguno de los dos tiene logica propia que valga separar. Partirlos
 * daria dos hooks que siempre se llaman en pareja.
 */
export function useTaskExtras(taskId: string | null, userId: string | undefined) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    if (!taskId) {
      setNotes([]);
      setAttachments([]);
      return;
    }

    try {
      // En paralelo: no dependen entre si, y encadenarlos duplicaria la espera.
      const [proximasNotas, proximosArchivos] = await Promise.all([
        fetchTaskNotes(taskId),
        fetchTaskAttachments(taskId),
      ]);
      setNotes(proximasNotas);
      setAttachments(proximosArchivos);
    } catch (fallo) {
      console.error('[tareas] no se pudieron cargar notas y adjuntos', fallo);
    }
  }, [taskId]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const agregarNota = useCallback(
    async (cuerpo: string) => {
      if (!taskId) return;
      try {
        await createTaskNote(taskId, cuerpo);
        await recargar();
      } catch (fallo) {
        console.error('[tareas] no se pudo agregar la nota', fallo);
        setError('No se pudo guardar la nota.');
      }
    },
    [taskId, recargar],
  );

  const borrarNota = useCallback(
    async (id: string) => {
      try {
        await deleteTaskNote(id);
        await recargar();
      } catch (fallo) {
        console.error('[tareas] no se pudo borrar la nota', fallo);
      }
    },
    [recargar],
  );

  const adjuntar = useCallback(
    async (archivo: File) => {
      if (!taskId || !userId) return;
      setError('');
      setSubiendo(true);

      try {
        await uploadTaskAttachment(userId, taskId, archivo);
        await recargar();
      } catch (fallo) {
        console.error('[tareas] no se pudo adjuntar', fallo);
        // El mensaje del bucket -tipo no admitido, pasado de tamaño- es lo unico
        // que explica por que no entro, asi que se muestra tal cual.
        setError(fallo instanceof Error ? fallo.message : 'No se pudo adjuntar el archivo.');
      } finally {
        setSubiendo(false);
      }
    },
    [taskId, userId, recargar],
  );

  const borrarAdjunto = useCallback(
    async (adjunto: TaskAttachment) => {
      try {
        await deleteTaskAttachment(adjunto.id, adjunto.storagePath);
        await recargar();
      } catch (fallo) {
        console.error('[tareas] no se pudo borrar el adjunto', fallo);
      }
    },
    [recargar],
  );

  return { notes, attachments, subiendo, error, agregarNota, borrarNota, adjuntar, borrarAdjunto };
}
