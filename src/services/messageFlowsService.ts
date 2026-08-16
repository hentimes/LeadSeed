import {
  callDispatchQueue,
  callEnrollLeadInFlow,
  deleteFlowRow,
  fetchEnrollmentRows,
  fetchFlowRows,
  fetchFlowStepRows,
  fetchProgressRows,
  insertFlow,
  replaceFlowSteps,
  updateEnrollment,
  updateFlow,
  updateProgress,
  type MessageFlowRow,
  type MessageFlowStepRow,
} from '../repositories/messageFlowsRepository';
import type {
  ExitReason,
  FlowChannel,
  MessageFlow,
  MessageFlowEnrollment,
  MessageFlowProgress,
  MessageFlowStep,
  PendingFlowStep,
} from '../types';

function mapFlow(row: MessageFlowRow): MessageFlow {
  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    ...(row.description ? { description: row.description } : {}),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapStep(row: MessageFlowStepRow): MessageFlowStep {
  return {
    id: row.id,
    flowId: row.flow_id,
    stepOrder: row.step_order,
    templateId: row.template_id,
    waitDays: row.wait_days,
  };
}

export async function fetchFlows(channel?: FlowChannel): Promise<MessageFlow[]> {
  return (await fetchFlowRows(channel)).map(mapFlow);
}

export async function fetchFlowSteps(flowId: string): Promise<MessageFlowStep[]> {
  return (await fetchFlowStepRows(flowId)).map(mapStep);
}

export async function fetchEnrollments(flowId: string): Promise<MessageFlowEnrollment[]> {
  return (await fetchEnrollmentRows(flowId)).map((row) => ({
    id: row.id,
    flowId: row.flow_id,
    leadId: row.lead_id,
    channel: row.channel,
    status: row.status,
    enrolledAt: row.enrolled_at,
    ...(row.exited_at ? { exitedAt: row.exited_at } : {}),
    ...(row.exit_reason ? { exitReason: row.exit_reason } : {}),
  }));
}

export async function fetchProgress(enrollmentIds: number[]): Promise<MessageFlowProgress[]> {
  return (await fetchProgressRows(enrollmentIds)).map((row) => ({
    id: row.id,
    enrollmentId: row.enrollment_id,
    stepId: row.step_id,
    status: row.status,
    ...(row.due_at ? { dueAt: row.due_at } : {}),
    ...(row.dispatched_at ? { dispatchedAt: row.dispatched_at } : {}),
    ...(row.send_log_id !== null ? { sendLogId: row.send_log_id } : {}),
  }));
}

/** Un flujo necesita nombre y al menos un paso; la base lo exige y aqui se avisa antes. */
export function validarFlujo(nombre: string, pasos: unknown[]): string | null {
  if (nombre.trim().length === 0) return 'Ponle un nombre al flujo.';
  if (pasos.length === 0) return 'Añade al menos un paso.';
  return null;
}

export async function saveFlow(
  userId: string,
  flujo: { id?: string; channel: FlowChannel; name: string; description?: string },
  pasos: Array<{ templateId: string; waitDays: number }>
): Promise<string> {
  const nombre = flujo.name.trim();

  const flowId = flujo.id
    ? (await updateFlow(flujo.id, { name: nombre, description: flujo.description ?? null, updated_at: new Date().toISOString() }), flujo.id)
    : await insertFlow({ user_id: userId, channel: flujo.channel, name: nombre, description: flujo.description ?? null });

  await replaceFlowSteps(
    flowId,
    pasos.map((p, i) => ({ step_order: i + 1, template_id: p.templateId, wait_days: p.waitDays }))
  );

  return flowId;
}

export async function setFlowActive(id: string, activo: boolean): Promise<void> {
  await updateFlow(id, { is_active: activo, updated_at: new Date().toISOString() });
}

/**
 * Borra un flujo.
 *
 * Falla si alguno de sus pasos tiene progreso: la base lo protege con
 * `on delete restrict`. Es deliberado -perder el rastro de lo enviado para
 * limpiar una definicion es mal intercambio- asi que aqui se traduce el error
 * de Postgres a algo que se entienda en pantalla.
 */
export async function deleteFlow(id: string): Promise<void> {
  try {
    await deleteFlowRow(id);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    if (/violates foreign key|restrict/i.test(mensaje)) {
      throw new Error(
        'Este flujo ya tiene envios registrados y no se puede borrar sin perder ese historial. Puedes pausarlo.',
        { cause: error }
      );
    }
    throw error;
  }
}

/**
 * Inscribe un lead. Toda la logica vive en el RPC porque la inscripcion y su
 * primera fila de progreso tienen que ser atomicas.
 */
export async function enrollLead(flowId: string, leadId: string): Promise<void> {
  try {
    await callEnrollLeadInFlow(flowId, leadId);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    // El indice unico parcial de la 108 es quien rechaza al lead que ya ocupa
    // ese canal. Sin traducir, el usuario veria el texto crudo de Postgres.
    if (/una_activa_por_canal|duplicate key/i.test(mensaje)) {
      throw new Error('Este lead ya esta en otro flujo del mismo canal. Sacalo de ese primero.', {
        cause: error,
      });
    }
    throw error;
  }
}

export async function exitEnrollment(id: number, motivo: ExitReason): Promise<void> {
  await updateEnrollment(id, {
    status: 'salida',
    exited_at: new Date().toISOString(),
    exit_reason: motivo,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Que falta enviar hoy.
 *
 * El RPC promueve `pendiente` a `toca` antes de leer, asi que basta llamarlo:
 * no hay que calcular vencimientos en el cliente.
 */
export async function fetchDispatchQueue(): Promise<PendingFlowStep[]> {
  return (await callDispatchQueue()).map((row) => ({
    progressId: row.progress_id as number,
    enrollmentId: row.enrollment_id as number,
    leadId: row.lead_id as string,
    leadName: (row.lead_name as string) || '',
    flowId: row.flow_id as string,
    flowName: (row.flow_name as string) || '',
    channel: row.channel as FlowChannel,
    stepOrder: row.step_order as number,
    totalSteps: 0,
    templateId: row.template_id as string,
    templateName: (row.template_name as string) || '',
    ...(row.due_at ? { dueAt: row.due_at as string } : {}),
  }));
}

/** Marca un paso como registrado. El trigger de la base crea el siguiente. */
export async function markStepRegistered(progressId: number, sendLogId?: number): Promise<void> {
  await updateProgress(progressId, {
    status: 'registrado',
    dispatched_at: new Date().toISOString(),
    ...(sendLogId !== undefined ? { send_log_id: sendLogId } : {}),
    updated_at: new Date().toISOString(),
  });
}

export async function skipStep(progressId: number): Promise<void> {
  await updateProgress(progressId, { status: 'omitido', updated_at: new Date().toISOString() });
}
