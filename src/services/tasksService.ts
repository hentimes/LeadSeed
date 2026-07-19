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
