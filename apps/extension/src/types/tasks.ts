export type TaskStatus = 'pendiente' | 'completada';

export interface Task {
  id?: string;
  titulo: string;
  descripcion: string;
  leadIds: string[];
  leadListIds: number[];
  fechaVencimiento: string;  // ISO date
  status: TaskStatus;
  /**
   * El segundo eje de la matriz de Eisenhower.
   *
   * La urgencia sale de `fechaVencimiento`; esto dice si la tarea acerca a un
   * objetivo. Son ejes distintos a proposito: lo urgente tapa a lo importante
   * cuando se los mezcla en una sola lista ordenada por fecha.
   */
  importante: boolean;
  /** Columna del tablero. `null` = "Sin seccion". */
  sectionId: string | null;
  /** Color elegido por el usuario, hexadecimal. `null` = sin color. */
  color: string | null;
  createdAt: string;
}

/** Una columna del tablero de tareas. */
export interface TaskSection {
  id: string;
  name: string;
  position: number;
}

/** Largo maximo del nombre de una seccion. Coincide con el CHECK de la 132. */
export const MAX_TASK_SECTION_NAME = 40;

/** Un paso dentro de una tarea. */
export interface Subtask {
  id: string;
  taskId: string;
  titulo: string;
  hecha: boolean;
  position: number;
}

/** Una anotacion fechada de una tarea. */
export interface TaskNote {
  id: string;
  taskId: string;
  cuerpo: string;
  createdAt: string;
}

/** Un archivo colgado de una tarea. */
export interface TaskAttachment {
  id: string;
  taskId: string;
  storagePath: string;
  nombre: string;
  mime: string;
  bytes: number;
  createdAt: string;
  /** URL firmada. `null` si la firma fallo: el bucket es privado. */
  url: string | null;
}
