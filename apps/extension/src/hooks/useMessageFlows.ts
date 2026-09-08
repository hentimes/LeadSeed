import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import {
  deleteFlow,
  enrollLead,
  enrollLeadFrom,
  enrollLeadsFrom,
  exitEnrollment,
  fetchDispatchQueue,
  fetchFlows,
  fetchFlowSteps,
  markStepRegistered,
  saveFlow,
  setFlowActive,
  skipStep,
} from '../services/messageFlowsService';
import type { ExitReason, FlowChannel, MessageFlow, MessageFlowStep, PendingFlowStep } from '../types';

/**
 * Flujos de mensajes y la cola de lo que toca enviar.
 *
 * Mismo contrato que `useMessageReasons`: `refreshKey` para que quien lo use
 * vuelva a pedir datos cuando cambian desde otra pestaña.
 *
 * La cola se refresca a mano tras cada despacho (`recargarCola`) ademas de por
 * Realtime: lo que se acaba de enviar tiene que salir de la lista sin esperar
 * a que llegue el evento.
 */
export function useMessageFlows() {
  const { user } = useAuth();
  const [cola, setCola] = useState<PendingFlowStep[]>([]);

  const subscriptions = useMemo(
    () => [
      { channel: 'public:message_flows', table: 'message_flows' },
      { channel: 'public:message_flow_progress', table: 'message_flow_progress' },
    ],
    []
  );
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const getAll = useCallback(
    async (channel?: FlowChannel): Promise<MessageFlow[]> => {
      if (!user) return [];
      return fetchFlows(channel);
    },
    [user]
  );

  const getSteps = useCallback(async (flowId: string): Promise<MessageFlowStep[]> => {
    return fetchFlowSteps(flowId);
  }, []);

  const recargarCola = useCallback(async () => {
    if (!user) {
      setCola([]);
      return;
    }
    setCola(await fetchDispatchQueue());
  }, [user]);

  const save = useCallback(
    async (
      flujo: { id?: string; channel: FlowChannel; name: string; description?: string },
      pasos: Array<{ templateId: string; waitDays: number }>
    ) => {
      if (!user) throw new Error('No autenticado');
      const id = await saveFlow(user.id, flujo, pasos);
      triggerRefresh();
      return id;
    },
    [triggerRefresh, user]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteFlow(id);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const setActivo = useCallback(
    async (id: string, activo: boolean) => {
      await setFlowActive(id, activo);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  /**
   * Inscribe, opcionalmente dando por hechos los pasos que el lead ya recibio.
   *
   * Sin los dos ultimos argumentos se comporta como siempre: desde el paso 1.
   */
  const inscribir = useCallback(
    async (flowId: string, leadId: string, ultimoPasoHecho = 0, desde: string | null = null) => {
      if (ultimoPasoHecho > 0) await enrollLeadFrom(flowId, leadId, ultimoPasoHecho, desde);
      else await enrollLead(flowId, leadId);
      triggerRefresh();
      await recargarCola();
    },
    [recargarCola, triggerRefresh]
  );

  /** Inscribe a varios de una vez. Devuelve las cuentas para poder contarlas. */
  const inscribirTodos = useCallback(
    async (flowId: string, leadIds: string[], usarDeteccion: boolean, pasoInicial = 1) => {
      const resultado = await enrollLeadsFrom(flowId, leadIds, usarDeteccion, pasoInicial);
      triggerRefresh();
      await recargarCola();
      return resultado;
    },
    [recargarCola, triggerRefresh]
  );

  const sacar = useCallback(
    async (enrollmentId: number, motivo: ExitReason) => {
      await exitEnrollment(enrollmentId, motivo);
      triggerRefresh();
      await recargarCola();
    },
    [recargarCola, triggerRefresh]
  );

  const registrarPaso = useCallback(
    async (progressId: number, sendLogId?: number) => {
      await markStepRegistered(progressId, sendLogId);
      await recargarCola();
    },
    [recargarCola]
  );

  const omitirPaso = useCallback(
    async (progressId: number) => {
      await skipStep(progressId);
      await recargarCola();
    },
    [recargarCola]
  );

  return {
    cola,
    recargarCola,
    getAll,
    getSteps,
    save,
    remove,
    setActivo,
    inscribir,
    inscribirTodos,
    sacar,
    registrarPaso,
    omitirPaso,
    refreshKey,
  };
}
