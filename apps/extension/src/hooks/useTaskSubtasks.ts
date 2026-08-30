import { useCallback, useEffect, useState } from 'react';
import {
  createSubtask,
  deleteSubtask,
  fetchSubtasks,
  setSubtaskDone,
} from '../repositories/taskSubtasksRepository';
import type { Subtask } from '../types';

/** Hueco entre posiciones, para reordenar sin renumerar todo. */
const PASO = 10;

/**
 * Las subtareas de UNA tarea.
 *
 * Se recargan al cambiar la tarea abierta.
 *
 * Marcar una se aplica al instante y despues se guarda: es el gesto mas
 * frecuente del panel, y esperar el viaje de red hace que la casilla se sienta
 * trabada. Si el guardado falla se vuelve al valor anterior, porque dejarla
 * marcada seria mentir sobre lo que quedo en la base.
 *
 * Las consultas viven en el repositorio y no aca: el cliente de Supabase solo
 * puede tocarse desde `repositories/`.
 */
export function useTaskSubtasks(taskId: string | null) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  const recargar = useCallback(async () => {
    if (!taskId) {
      setSubtasks([]);
      return;
    }

    try {
      setSubtasks(await fetchSubtasks(taskId));
    } catch (error) {
      console.error('[tareas] no se pudieron cargar las subtareas', error);
    }
  }, [taskId]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const agregar = useCallback(
    async (titulo: string) => {
      if (!taskId) return;
      const ultima = subtasks[subtasks.length - 1];

      try {
        await createSubtask(taskId, titulo, (ultima?.position ?? 0) + PASO);
        await recargar();
      } catch (error) {
        console.error('[tareas] no se pudo agregar la subtarea', error);
      }
    },
    [taskId, subtasks, recargar],
  );

  const alternar = useCallback(async (subtask: Subtask) => {
    const proxima = !subtask.hecha;

    setSubtasks((previas) =>
      previas.map((s) => (s.id === subtask.id ? { ...s, hecha: proxima } : s)),
    );

    try {
      await setSubtaskDone(subtask.id, proxima);
    } catch (error) {
      console.error('[tareas] no se pudo marcar la subtarea', error);
      setSubtasks((previas) =>
        previas.map((s) => (s.id === subtask.id ? { ...s, hecha: subtask.hecha } : s)),
      );
    }
  }, []);

  const borrar = useCallback(
    async (id: string) => {
      try {
        await deleteSubtask(id);
        await recargar();
      } catch (error) {
        console.error('[tareas] no se pudo borrar la subtarea', error);
      }
    },
    [recargar],
  );

  const hechas = subtasks.filter((s) => s.hecha).length;

  return { subtasks, hechas, agregar, alternar, borrar, recargar };
}
