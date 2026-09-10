import {
  callDeleteFlowConInscripciones,
  callDispatchQueue,
  callEnrollLeadInFlow,
  callEnrollLeadInFlowFrom,
  callEnrollLeadsInFlow,
  callMarcarPasoSinWhatsApp,
  callRescheduleFlowSteps,
  callSalirDelFlujo,
  fetchFlowPositionRows,
  callAdvanceFlowSteps,
  fetchFlowUpcomingRows,
  fetchFlowResumePoints,
  fetchEnrollmentRows,
  fetchFlowRows,
  fetchFlowNamesUsingTemplate,
  fetchFlowStepRows,
  fetchProgressRows,
  insertFlow,
  replaceFlowSteps,
  updateFlow,
  updateProgress,
  type MessageFlowEnrollmentRow,
  type ResultadoDeTanda,
  type MessageFlowRow,
  type MessageFlowStepRow,
} from '../repositories/messageFlowsRepository';
import { mensajeDeRechazoAlInscribir } from './flowEnrollErrors';
import type { PuntoDeRetoma } from './flowResume';
import type { PosicionEnFlujo } from './flowEnrollSort';
import type { Reprogramacion } from './whatsappQuota';
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

/** Que flujos usan esta plantilla. Vacio si ninguno. */
export async function fetchFlowsUsingTemplate(templateId: string): Promise<string[]> {
  return fetchFlowNamesUsingTemplate(templateId);
}

/**
 * El nombre del lead que viene incrustado en la fila de inscripcion.
 *
 * PostgREST devuelve un objeto en una relacion de uno y un arreglo en una de
 * muchos. Se aceptan las dos: leer solo una de las formas es lo que dejaba a
 * todos los inscritos como "Sin nombre".
 */
function nombreIncrustado(leads: MessageFlowEnrollmentRow['leads']): string | null {
  if (!leads) return null;
  return (Array.isArray(leads) ? leads[0]?.name : leads.name) ?? null;
}

export async function fetchEnrollments(flowId: string): Promise<MessageFlowEnrollment[]> {
  return (await fetchEnrollmentRows(flowId)).map((row) => ({
    id: row.id,
    flowId: row.flow_id,
    leadId: row.lead_id,
    channel: row.channel,
    status: row.status,
    enrolledAt: row.enrolled_at,
    ...(nombreIncrustado(row.leads) ? { leadName: nombreIncrustado(row.leads) as string } : {}),
    ...(row.exited_at ? { exitedAt: row.exited_at } : {}),
    ...(row.exit_reason ? { exitReason: row.exit_reason } : {}),
    ...(row.exit_note ? { exitNote: row.exit_note } : {}),
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
 * Borra un flujo, con sus inscripciones y su progreso.
 *
 * Antes esto era un `delete` a secas y fallaba en cuanto el flujo tenia un solo
 * inscrito, por el `on delete restrict` que protege los pasos con progreso. El
 * mensaje que se daba entonces -"tiene envios registrados... puedes pausarlo"-
 * era ademas equivocado en lo que importaba: el historial de envios no vive en
 * el progreso sino en `send_logs`, que esto no toca. Lo que se pierde es el
 * rastro de la inscripcion, no los mensajes.
 *
 * Y pausar no era una alternativa: dejaba el flujo, sus pasos y sus plantillas
 * congelados para siempre. La migracion 157 cuenta el callejon completo.
 */
export async function deleteFlow(id: string): Promise<void> {
  const borrados = await callDeleteFlowConInscripciones(id);
  if (borrados === 0) {
    throw new Error('El flujo ya no existe. Actualiza la lista.');
  }
}

/** Trae a hoy los pasos que vencian hasta esa fecha. Devuelve cuantos movio. */
export async function adelantarPasos(hasta: Date): Promise<number> {
  return callAdvanceFlowSteps(hasta.toISOString());
}

/** Cuantos pasos vencen cada uno de los proximos dias. Ver migracion 168. */
export async function fetchCargaProxima(dias = 14): Promise<Array<{ dia: string; cantidad: number }>> {
  return fetchFlowUpcomingRows(dias);
}

/**
 * Quien de la agenda esta en un flujo y por que paso va.
 *
 * Se pide una vez al abrir la pantalla de inscribir. Devuelve una fila por
 * inscripcion activa -como mucho una por lead y canal-, no una por lead.
 */
export async function fetchFlowPositions(): Promise<PosicionEnFlujo[]> {
  return (await fetchFlowPositionRows()).map((row) => ({
    leadId: row.lead_id,
    flowId: row.flow_id,
    flowName: row.flow_name,
    channel: row.channel,
    stepOrder: row.step_order,
    dueAt: row.due_at,
  }));
}

/**
 * Por que paso va cada lead de la agenda frente a este flujo.
 *
 * Se pide una vez al abrir la pantalla de inscribir, no una por lead: es una
 * fila por lead que tenga algun envio de las plantillas del flujo, y en la
 * mayoria de las cuentas son unas pocas.
 */
export async function fetchResumePoints(flowId: string): Promise<PuntoDeRetoma[]> {
  return (await fetchFlowResumePoints(flowId)).map((row) => ({
    leadId: row.lead_id,
    ultimoPasoHecho: row.last_done_order,
    ultimoEnvioAt: row.last_sent_at,
  }));
}

/**
 * Inscribe un lead dando por hechos los pasos que ya recibio.
 *
 * `ultimoPasoHecho` en cero es la inscripcion normal, desde el primer paso.
 * `desde` es la fecha del ultimo envio: la espera del paso siguiente se cuenta
 * desde ahi y no desde el momento de inscribir, o retomar castigaria con una
 * espera que ya paso.
 */
export async function enrollLeadFrom(
  flowId: string,
  leadId: string,
  ultimoPasoHecho: number,
  desde: string | null,
): Promise<void> {
  try {
    await callEnrollLeadInFlowFrom(flowId, leadId, ultimoPasoHecho, desde);
  } catch (error) {
    /*
     * Esta via no traducia nada, y es la que usa el panel de inscribir. Con las
     * marcas de la 185 empezo a rechazar dos casos mas, asi que sin esto lo
     * primero que veria el usuario al inscribir a alguien de la lista "No
     * contactar" seria el texto crudo de Postgres con un UUID adentro.
     */
    const mensaje = mensajeDeRechazoAlInscribir(error);
    if (mensaje) throw new Error(mensaje, { cause: error });
    throw error;
  }
}

/**
 * Aplica una reprogramacion ya decidida.
 *
 * El reparto lo calcula `whatsappQuota`, que es puro y esta probado; aqui solo
 * se escribe. Devuelve cuantos pasos se movieron de verdad, que no tiene por
 * que coincidir con los pedidos: uno que se registro entre que se calculo y se
 * pulso ya no se toca.
 */
export async function reprogramarPasos(movimientos: Reprogramacion[]): Promise<number> {
  if (movimientos.length === 0) return 0;
  return callRescheduleFlowSteps(movimientos);
}

/**
 * Inscribe a varios de una vez.
 *
 * Con `usarDeteccion`, cada uno entra por el paso que ya recibio; la deteccion
 * la rehace la base, no se le manda calculada desde aqui. Devuelve las cuentas
 * porque una tanda casi nunca sale redonda: los que ya estaban en un flujo del
 * mismo canal se saltan, y eso hay que poder decirlo.
 */
export type { ResultadoDeTanda };

export async function enrollLeadsFrom(
  flowId: string,
  leadIds: string[],
  usarDeteccion: boolean,
  pasoInicial = 1,
): Promise<ResultadoDeTanda> {
  return callEnrollLeadsInFlow(flowId, leadIds, usarDeteccion, pasoInicial);
}

/**
 * Inscribe un lead. Toda la logica vive en el RPC porque la inscripcion y su
 * primera fila de progreso tienen que ser atomicas.
 */
export async function enrollLead(flowId: string, leadId: string): Promise<void> {
  try {
    await callEnrollLeadInFlow(flowId, leadId);
  } catch (error) {
    // Los rechazos que se saben explicar se traducen; el resto sube tal cual.
    // Ver `flowEnrollErrors`.
    const mensaje = mensajeDeRechazoAlInscribir(error);
    if (mensaje) throw new Error(mensaje, { cause: error });
    throw error;
  }
}

/**
 * Saca un lead de un flujo, con motivo y con detalle.
 *
 * ## Por que ya no es un `update`
 *
 * Lo era, y dejaba el trabajo a medias: cerraba la inscripcion y no tocaba las
 * filas de progreso, que se quedaban en `pendiente` para siempre. La cola del
 * dia no las mostraba -filtra por el estado de la inscripcion- pero seguian
 * ahi, diciendo que tocaban, contando en cualquier consulta que no supiera de
 * ese filtro.
 *
 * Ahora lo hace el RPC de la 184, en una transaccion, y ademas marca al lead
 * cuando el motivo lo exige.
 *
 * ## Lo que se conserva
 *
 * Los pasos ya registrados NO se tocan: hasta donde llego cada uno es
 * justamente lo que hay que poder mirar despues, junto con la nota.
 */
export async function exitEnrollment(
  id: number,
  motivo: ExitReason,
  nota?: string,
): Promise<void> {
  await callSalirDelFlujo(id, motivo, nota?.trim() || null);
}

/**
 * El numero de este paso no esta en WhatsApp.
 *
 * Deshace el envio que se registro al abrir el chat -deja de contar en el cupo,
 * en el panel y en la ficha del lead-, omite el paso, borra el siguiente que el
 * trigger habia programado y saca al lead de sus flujos de WhatsApp.
 *
 * Existe porque WhatsApp Web avisa en un dialogo propio, dentro de una pestaña
 * que no es nuestra: la unica que puede saberlo es la persona que esta
 * mirando.
 */
export async function marcarPasoSinWhatsApp(progressId: number): Promise<void> {
  await callMarcarPasoSinWhatsApp(progressId);
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
