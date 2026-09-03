import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import { claves } from '../lib/queryClient';
import {
  deleteMessageReason,
  fetchMessageReasons,
  saveMessageReason,
  type MessageReason,
} from '../services/messageReasonsService';

const VACIO: MessageReason[] = [];

/**
 * Catalogo de motivos del usuario.
 *
 * Primer hook migrado a la cache de estado servidor, y sirve de patron para el
 * resto. Antes devolvia `getAll` mas un contador `refreshKey`, y cada una de
 * las cuatro pantallas que lo usan repetia el mismo
 * `useEffect(() => { getAll().then(setReasons) })`. Cuatro copias del mismo
 * efecto, cuatro estados locales con los mismos datos, y una peticion por
 * pantalla montada aunque fueran simultaneas.
 *
 * Ahora devuelve los motivos ya resueltos. Quien lo consuma no hace efectos ni
 * guarda estado: la cache deduplica las peticiones y comparte el resultado.
 *
 * El realtime se conserva, pero cambia de papel: en vez de incrementar un
 * contador que obligaba a cada pantalla a volver a pedir por su cuenta, invalida
 * la clave una vez y la cache decide si hay que ir al servidor.
 */
export function useMessageReasons() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const subscriptions = useMemo(
    () => [{ channel: 'public:message_reasons', table: 'message_reasons' }],
    []
  );
  const { refreshKey } = useRealtimeRefresh(subscriptions);

  const clave = useMemo(() => claves.motivos(userId ?? ''), [userId]);

  const invalidar = useCallback(() => {
    void qc.invalidateQueries({ queryKey: clave });
  }, [qc, clave]);

  // Un cambio llegado por realtime desde otra pestaña invalida la clave. Se
  // hace en un efecto y no dentro de la suscripcion porque `useRealtimeRefresh`
  // solo expone el contador, y reescribirlo entero no toca a este hook.
  useEffect(() => {
    if (refreshKey > 0) invalidar();
  }, [refreshKey, invalidar]);

  const consulta = useQuery({
    queryKey: clave,
    queryFn: () => fetchMessageReasons(userId as string),
    enabled: Boolean(userId),
  });

  const guardar = useMutation({
    mutationFn: (reason: MessageReason) => {
      if (!userId) throw new Error('No autenticado');
      return saveMessageReason(userId, reason);
    },
    onSuccess: invalidar,
  });

  const borrar = useMutation({
    mutationFn: (id: number) => deleteMessageReason(id),
    onSuccess: invalidar,
  });

  const save = useCallback(
    (reason: MessageReason): Promise<number> => guardar.mutateAsync(reason),
    [guardar]
  );

  const remove = useCallback((id: number): Promise<void> => borrar.mutateAsync(id), [borrar]);

  return {
    motivos: consulta.data ?? VACIO,
    cargando: consulta.isPending && Boolean(userId),
    save,
    remove,
  };
}
