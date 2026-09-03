import {
  createTaskRow,
  deleteTaskRow,
  fetchTaskRowsByUser,
  updateTaskRow,
  type TaskRow,
} from '../repositories/tasksRepository';
import type { LeadStatus, Task, TaskStatus } from '../types';

export function mapTaskRowToDomain(row: TaskRow): Task {
  return {
    id: row.id,
    titulo: row.title,
    descripcion: row.description || '',
    status: row.status as TaskStatus,
    fechaVencimiento: row.due_date || '',
    // Las filas anteriores a la migracion 131 no traen el campo.
    importante: row.is_important ?? false,
    sectionId: row.section_id ?? null,
    color: row.color ?? null,
    leadIds: row.lead_id ? [row.lead_id] : [],
    leadListIds: row.lead_list_ids || [],
    createdAt: row.created_at,
  };
}

function mapTaskInputToRow(
  userId: string,
  data: Omit<Task, 'id' | 'createdAt' | 'status'>,
  status: TaskStatus
): Record<string, unknown> {
  return {
    title: data.titulo,
    description: data.descripcion,
    status,
    due_date: data.fechaVencimiento || null,
    lead_id: data.leadIds.length > 0 ? data.leadIds[0] : null,
    lead_list_ids: data.leadListIds || [],
    user_id: userId,
    /*
     * Estos tres faltaban, y no era cosmetico: se agregaron al tipo `Task` y al
     * formulario, pero nunca al payload que se guarda. O sea que marcar "es
     * importante", elegir un color o mover una tarea de columna se veia en
     * pantalla y se perdia al recargar.
     *
     * El peor de los tres era la importancia: es uno de los dos ejes de la
     * matriz, asi que la matriz repartia sobre un dato que jamas llegaba a la
     * base y todo caia en la fila de "no importante".
     */
    is_important: data.importante,
    color: data.color,
    section_id: data.sectionId,
  };
}

export async function fetchTasksForUser(userId: string): Promise<Task[]> {
  const rows = await fetchTaskRowsByUser(userId);
  return rows.map(mapTaskRowToDomain);
}

export async function saveTaskForUser(
  userId: string,
  data: Omit<Task, 'id' | 'createdAt' | 'status'>,
  currentStatus: TaskStatus,
  editingId?: string
): Promise<void> {
  const payload = mapTaskInputToRow(userId, data, currentStatus);

  if (editingId) {
    await updateTaskRow(editingId, payload);
    return;
  }

  await createTaskRow({
    ...payload,
    created_at: new Date().toISOString(),
  });
}

export async function toggleTaskCompletion(task: Task): Promise<void> {
  if (!task.id) {
    return;
  }

  const newStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada';
  await updateTaskRow(task.id, { status: newStatus });
}

export async function removeTask(id: string | number): Promise<void> {
  await deleteTaskRow(id);
}

export async function createFollowUpTaskForLead(params: {
  userId: string;
  leadId: string;
  leadName: string;
  newStatus: LeadStatus;
  title: string;
  dueDateIso?: string | null;
}): Promise<void> {
  await createTaskRow({
    title: params.title.trim(),
    description: `Lead: ${params.leadName} (${params.newStatus})`,
    lead_id: params.leadId,
    lead_list_ids: [],
    due_date: params.dueDateIso || null,
    status: 'pendiente',
    user_id: params.userId,
    created_at: new Date().toISOString(),
  });
}

/**
 * Una tarea con lo minimo: titulo, cuando y de que lead viene.
 *
 * Existe para las que nacen fuera de la pantalla de Tareas -al cerrar una
 * reunion, o despues, desde una cita ya registrada-. `saveTaskForUser` pide el
 * `Task` entero con seccion, subtareas y adjuntos; ahi solo hay tres datos, y
 * completar el resto con vacios en cada sitio que la cree acabaria
 * duplicandose.
 */
export async function createQuickTask(params: {
  userId: string;
  leadId?: string | null;
  title: string;
  description: string;
  dueDateIso?: string | null;
}): Promise<void> {
  await createTaskRow({
    title: params.title.trim(),
    description: params.description,
    lead_id: params.leadId ?? null,
    lead_list_ids: [],
    due_date: params.dueDateIso || null,
    status: 'pendiente',
    user_id: params.userId,
    created_at: new Date().toISOString(),
  });
}
