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
  /**
   * Viene del join con leads.
   *
   * El tipo admite las dos formas porque PostgREST devuelve un OBJETO cuando la
   * relacion es de uno -que es este caso, `enrollment.lead_id`- y un arreglo
   * cuando es de muchos. Antes se declaraba solo como arreglo y el servicio
   * leia `leads[0]`, que en tiempo de ejecucion era siempre `undefined`: por eso
   * todos los inscritos aparecian como "Sin nombre" en el detalle del flujo.
   */
  leads?: Array<{ name: string | null }> | { name: string | null } | null;
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

/**
 * Los nombres de los flujos que usan una plantilla.
 *
 * Existe para poder explicar por que no se deja borrar una plantilla. El
 * `on delete restrict` de `message_flow_steps.template_id` da un error correcto
 * pero mudo -un codigo 23503-, y "no se puede" sin decir quien la usa obliga a
 * abrir los flujos de a uno para encontrarlo.
 *
 * Una sola consulta con la relacion incrustada, no una por flujo. Supabase tipa
 * la relacion como arreglo aunque sea de uno; se declara igual que en
 * `MessageFlowEnrollmentRow` y se toma el primero.
 */
export async function fetchFlowNamesUsingTemplate(templateId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(STEPS)
    .select('message_flows(name)')
    .eq('template_id', templateId);

  if (error || !data) {
    if (error) console.error('fetchFlowNamesUsingTemplate failed', error);
    return [];
  }

  const nombres = (data as Array<{ message_flows?: Array<{ name: string }> | { name: string } | null }>)
    .map((fila) => {
      const relacion = fila.message_flows;
      if (Array.isArray(relacion)) return relacion[0]?.name;
      return relacion?.name;
    })
    .filter((nombre): nombre is string => Boolean(nombre));

  // Un flujo puede usar la misma plantilla en dos pasos: se nombra una vez.
  return [...new Set(nombres)];
}

export async function fetchEnrollmentRows(
  flowId: string,
  status?: EnrollmentStatus
): Promise<MessageFlowEnrollmentRow[]> {
  let q = supabase
    .from(ENROLLMENTS)
    // Se trae el nombre del lead en el mismo viaje: la alternativa era pedir
    // los leads aparte y cruzarlos en el cliente, que con 1900 leads seria
    // traerlos todos para mostrar doce.
    .select('id, flow_id, lead_id, channel, status, enrolled_at, exited_at, exit_reason, leads(name)')
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

/**
 * Borra el flujo con sus inscripciones y su progreso, en una transaccion.
 *
 * No es un `delete` sobre la tabla porque el borrado directo esta bloqueado por
 * el `on delete restrict` de `message_flow_progress.step_id` en cuanto hay un
 * inscrito; ver la migracion 157, que explica el callejon entero. La funcion
 * borra en el orden que lo desarma.
 *
 * Devuelve cuantos flujos se borraron: cero significa que no existe o que no es
 * de quien llama, y RLS no distingue una cosa de la otra.
 */
export async function callDeleteFlowConInscripciones(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('delete_message_flow', { p_flow_id: id });
  if (error) throw error;
  return Number(data ?? 0);
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


export async function updateEnrollment(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(ENROLLMENTS).update(payload).eq('id', id);
  if (error) throw error;
}


/** Inscribe un lead. Toda la logica vive en el RPC para que sea atomica. */
/**
 * Trae a hoy los pasos que vencian hasta `hasta`.
 *
 * La espera de un flujo es una intencion, no una ley: quien maneja la agenda
 * decide mandar hoy lo que estaba para manana. Ver migracion 169.
 */
export async function callAdvanceFlowSteps(hasta: string): Promise<number> {
  const { data, error } = await supabase.rpc('advance_flow_steps', { p_hasta: hasta });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Cuantos pasos vencen cada dia. Ver migracion 168. */
export interface FlowUpcomingRow {
  dia: string;
  cantidad: number;
}

/**
 * La carga de los proximos dias.
 *
 * Existe sobre todo para que una vista de "Hoy" vacia pueda decir CUANDO toca
 * lo siguiente, en vez de dejar un vacio que se lee como "se perdieron mis
 * pendientes".
 */
export async function fetchFlowUpcomingRows(dias = 14): Promise<FlowUpcomingRow[]> {
  /*
   * La zona viaja al servidor: el dia de un vencimiento depende de donde este
   * quien mira. Un paso de las 21:00 en Santiago es del dia siguiente en UTC, y
   * agrupado en UTC la pantalla mostraba una fecha y decidia con otra.
   *
   * Se manda el nombre IANA y no un desfase en minutos: el nombre lleva
   * consigo los cambios de hora, un desfase fijo falla dos veces al año.
   */
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { data, error } = await supabase.rpc('my_flow_upcoming_load', {
    p_days: dias,
    p_tz: zona,
  });

  if (error || !data) {
    if (error) console.error('fetchFlowUpcomingRows failed', error);
    return [];
  }

  return data as FlowUpcomingRow[];
}

/** Una fila por inscripcion activa. Ver migracion 159. */
export interface FlowPositionRow {
  lead_id: string;
  flow_id: string;
  flow_name: string;
  channel: FlowChannel;
  step_order: number | null;
  due_at: string | null;
}

/**
 * Quien esta en un flujo y por que paso va, en toda la agenda.
 *
 * Un solo viaje: responderlo en el cliente pedia inscripciones, progreso y
 * pasos por separado y cruzarlos a mano.
 */
export async function fetchFlowPositionRows(): Promise<FlowPositionRow[]> {
  const { data, error } = await supabase.rpc('my_flow_positions');

  if (error || !data) {
    if (error) console.error('fetchFlowPositionRows failed', error);
    return [];
  }

  return data as FlowPositionRow[];
}

/** Una fila por lead con envios de las plantillas del flujo. Ver migracion 158. */
export interface FlowResumePointRow {
  lead_id: string;
  last_done_order: number;
  last_sent_at: string;
}

/**
 * Por que paso va cada lead segun lo que ya se le envio.
 *
 * El cruce lo hace la base: traerse `send_logs` para cruzarlo aqui haria crecer
 * el coste con los mensajes enviados cuando lo que la pantalla necesita crece
 * con los leads. Es el mismo criterio que documenta la 138.
 */
export async function fetchFlowResumePoints(flowId: string): Promise<FlowResumePointRow[]> {
  const { data, error } = await supabase.rpc('flow_resume_points', { p_flow_id: flowId });

  if (error || !data) {
    if (error) console.error('fetchFlowResumePoints failed', error);
    return [];
  }

  return data as FlowResumePointRow[];
}

/**
 * Inscribe dando por hechos los pasos hasta `lastDoneOrder`.
 *
 * Con cero equivale a `callEnrollLeadInFlow`, asi que la aplicacion llama solo
 * a esta. La otra se conserva en la base para las extensiones que todavia
 * tengan el bundle viejo.
 */
export async function callEnrollLeadInFlowFrom(
  flowId: string,
  leadId: string,
  lastDoneOrder: number,
  base: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('enroll_lead_in_flow_from', {
    p_flow_id: flowId,
    p_lead_id: leadId,
    p_last_done_order: lastDoneOrder,
    p_base: base,
  });
  if (error) throw error;
}

/**
 * Mueve el vencimiento de varios pasos de una vez.
 *
 * Va como arreglo de objetos y no como dos arreglos paralelos de ids y fechas:
 * asi cada fecha viaja pegada a su paso y no depende de que los dos lleguen en
 * el mismo orden. Ver migracion 162.
 */
export async function callRescheduleFlowSteps(
  movimientos: Array<{ progressId: number; dueAt: string }>,
): Promise<number> {
  const { data, error } = await supabase.rpc('reschedule_flow_steps', {
    p_updates: movimientos.map((m) => ({ progress_id: m.progressId, due_at: m.dueAt })),
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Lo que devuelve una inscripcion en tanda. Ver migracion 160. */
export interface ResultadoDeTanda {
  inscritos: number;
  yaEnFlujo: number;
  fallidos: number;
}

/**
 * Inscribe a varios de una vez, cada uno por donde va.
 *
 * Un viaje y no uno por lead: con cien, el bucle en el navegador tarda unos
 * diez segundos y deja el trabajo a medias si alguien cierra el panel.
 */
export async function callEnrollLeadsInFlow(
  flowId: string,
  leadIds: string[],
  usarDeteccion: boolean,
  pasoInicial: number,
): Promise<ResultadoDeTanda> {
  const { data, error } = await supabase.rpc('enroll_leads_in_flow', {
    p_flow_id: flowId,
    p_lead_ids: leadIds,
    p_use_detection: usarDeteccion,
    p_start_step: pasoInicial,
  });
  if (error) throw error;

  const fila = (data as Array<{ inscritos: number; ya_en_flujo: number; fallidos: number }>)?.[0];
  return {
    inscritos: fila?.inscritos ?? 0,
    yaEnFlujo: fila?.ya_en_flujo ?? 0,
    fallidos: fila?.fallidos ?? 0,
  };
}

export async function callEnrollLeadInFlow(flowId: string, leadId: string): Promise<void> {
  const { error } = await supabase.rpc('enroll_lead_in_flow', {
    p_flow_id: flowId,
    p_lead_id: leadId,
  });
  if (error) throw error;
}

/** Cola de lo que toca enviar. El RPC promueve pendiente a toca antes de leer. */
export async function callDispatchQueue(): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_my_flow_dispatch_queue');
  if (error || !data) return [];
  return data as Array<Record<string, unknown>>;
}

export async function updateProgress(id: number, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(PROGRESS).update(payload).eq('id', id);
  if (error) throw error;
}
