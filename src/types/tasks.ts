export type TaskStatus = 'pendiente' | 'completada';

export interface Task {
  id?: string;
  titulo: string;
  descripcion: string;
  leadIds: string[];
  leadListIds: number[];
  fechaVencimiento: string;  // ISO date
  status: TaskStatus;
  createdAt: string;
}
