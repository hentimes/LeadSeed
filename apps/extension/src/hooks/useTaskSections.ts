import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createTaskSection,
  deleteTaskSection,
  fetchTaskSections,
  moveTaskToSection,
  renameTaskSection,
} from '../repositories/taskSectionsRepository';
import type { TaskSection } from '../types';

/** Hueco entre posiciones, para poder reordenar sin renumerar todo. */
const PASO_DE_POSICION = 10;

/**
 * Las columnas del tablero de tareas.
 *
 * Cada operacion recarga la lista en vez de tocar el arreglo local. Es mas
 * lento que actualizar en memoria, pero las secciones se crean y se borran de a
 * una y muy de vez en cuando: el estado optimista aca solo agregaria una via
 * mas para que la pantalla y la base discrepen, sin ganancia que se note.
 *
 * Mover una tarea SI se ve al instante, pero eso lo resuelve la pagina con su
 * propio estado optimista: ahi el gesto es frecuente y la espera se nota.
 */
export function useTaskSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<TaskSection[]>([]);

  const recargar = useCallback(async () => {
    if (!user) {
      setSections([]);
      return;
    }
    setSections(await fetchTaskSections(user.id));
  }, [user]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const crear = useCallback(
    async (nombre: string) => {
      if (!user) return;
      const ultima = sections[sections.length - 1];
      await createTaskSection(user.id, nombre, (ultima?.position ?? 0) + PASO_DE_POSICION);
      await recargar();
    },
    [user, sections, recargar],
  );

  const renombrar = useCallback(
    async (id: string, nombre: string) => {
      await renameTaskSection(id, nombre);
      await recargar();
    },
    [recargar],
  );

  const borrar = useCallback(
    async (id: string) => {
      await deleteTaskSection(id);
      await recargar();
    },
    [recargar],
  );

  const moverTarea = useCallback(
    async (taskId: string, sectionId: string | null) => {
      await moveTaskToSection(taskId, sectionId);
    },
    [],
  );

  return { sections, crear, renombrar, borrar, moverTarea, recargar };
}
