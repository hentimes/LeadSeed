import { supabase } from '../lib/supabaseClient';
import type { EnrollmentStatus, ExitReason, FlowChannel, FlowStepStatus } from '../types';

export interface MessageFlowRow {
  id: string;
  channel: FlowChannel;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MessageFlowStepRow {
  id: number;
  flow_id: string;
  step_order: number;
  template_id: string;
  wait_days: number;
}

export interface MessageFlowEnrollmentRow {
  id: number;
  flow_id: string;
  lead_id: string;
  channel: FlowChannel;
  status: EnrollmentStatus;
  enrolled_at: string;
  exited_at: string | null;
  exit_reason: ExitReason | null;
}

export interface MessageFlowProgressRow {
  id: number;
  enrollment_id: number;
  step_id: number;
  status: FlowStepStatus;
  due_at: string | null;
  dispatched_at: string | null;
  send_log_id: number | null;
}

const FLOWS = 'message_flows';
const STEPS = 'message_flow_steps';
const ENROLLMENTS = 'message_flow_enrollments';
const PROGRESS = 'message_flow_progress';

/**
 * `user_id` no se manda nunca desde aqui.
 *
 * En `message_flows` lo pone la RLS al comprobar `auth.uid() = user_id`, asi que
 * si hace falta se pasa explicito; en las hijas lo pone un trigger que lo copia
 * del padre. Mandarlo desde el cliente en las hijas seria justo el agujero que
 * ese trigger cierra: la clave foranea no impide apuntar al flujo de otro.
 */

export async function fetchFlowRows(channel?: FlowChannel): Promise<MessageFlowRow[]> {
  let q = supabase
    .from(FLOWS)
    .select('id, channel, name, description, is_active, created_at')
    .order('created_at', { ascending: false });

  if (channel) q = q.eq('channel', channel);

  const { data, error } = await q;
  if (error || !data) return [];
  return data as MessageFlowRow[];
}

export async function fetchFlowStepRows(flowId: string): Promise<MessageFlowStepRow[]> {
  const { data, error } = await supabase
    .from(STEPS)
    .select('id, flow_id, step_order, template_id, wait_days')
    .eq('flow_id', flowId)
    .order('step_order');

  if (error || !data) return [];
  return data as MessageFlowStepRow[];
}

export async function fetchEnrollmentRows(
  flowId: string,
  status?: EnrollmentStatus
): Promise<MessageFlowEnrollmentRow[]> {
  let q = supabase
    .from(ENROLLMENTS)
    .select('id, flow_id, lead_id, channel, status, enrolled_at, exited_at, exit_reason')
    .eq('flow_id', flowId)
    .order('enrolled_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error || !data) return [];
  return data as MessageFlowEnrollmentRow[];
}

/** Inscripciones activas de un lead, para saber si ya ocupa un canal. */
export async function fetchActiveEnrollmentsForLead(
  leadId: string
): Promise<MessageFlowEnrollmentRow[]> {
  const { data, error } = await supabase
    .from(ENROLLMENTS)
    .select('id, flow_id, lead_id, channel, status, enrolled_at, exited_at, exit_reason')
    .eq('lead_id', leadId)
    .eq('status', 'activa');

  if (error || !data) return [];
  return data as MessageFlowEnrollmentRow[];
}

export async function fetchProgressRows(enrollmentIds: number[]): Promise<MessageFlowProgressRow[]> {
  if (enrollmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PROGRESS)
    .select('id, enrollment_id, step_id, status, due_at, dispatched_at, send_log_id')
    .in('enrollment_id', enrollmentIds);

  if (error || !data) return [];
  return data as MessageFlowProgressRow[];
}

export async function insertFlow(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.from(FLOWS).insert(payload).select('id').single();
  if (error || !data) throw error || new Error('No se pudo crear el flujo');
  return data.id as string;
}

export async function updateFlow(id: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(FLOWS).update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteFlowRow(id: string): Promise<void> {
  const { error } = await supabase.from(FLOWS).delete().eq('id', id);
  if (error) throw error;
}

export async function replaceFlowSteps(
  flowId: string,
  pasos: Array<{ step_order: number; template_id: string; wait_days: number }>
): Promise<void> {
  // Se borran y se reinsertan porque `unique(flow_id, step_order)` haria chocar
  // un reordenamiento hecho fila por fila. Los pasos con progreso no se pueden
  // borrar (`on delete restrict`), asi que si alguno lo tiene, esto falla y la
  // interfaz debe impedirlo antes de llegar aqui.
  const { error: errorBorrado } = await supabase.from(STEPS).delete().eq('flow_id', flowId);
  if (errorBorrado) throw errorBorrado;

  if (pasos.length === 0) return;

  const { error } = await supabase
    .from(STEPS)
    .insert(pasos.map((p) => ({ ...p, flow_id: flowId })));
  if (error) throw error;
}

export async function insertEnrollment(flowId: string, leadId: string): Promise<number> {
  // `channel` y `user_id` los pone el trigger desde el flujo; mandarlos desde
  // aqui seria darle al cliente una decision que no le corresponde.
  const { data, error } = await supabase
    .from(ENROLLMENTS)
    .insert({ flow_id: flowId, lead_id: leadId })
    .select('id')
    .single();

  if (error || !data) throw error || new Error('No se pudo inscribir el lead');
  return data.id as number;
}

export async function updateEnrollment(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(ENROLLMENTS).update(payload).eq('id', id);
  if (error) throw error;
}

export async function insertProgressRows(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(PROGRESS).insert(rows);
  if (error) throw error;
}

export async function updateProgress(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(PROGRESS).update(payload).eq('id', id);
  if (error) throw error;
}
