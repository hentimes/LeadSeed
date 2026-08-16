import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import {
  deleteMessageReason,
  fetchMessageReasons,
  saveMessageReason,
  type MessageReason,
} from '../services/messageReasonsService';

/**
 * Catalogo de motivos del usuario.
 *
 * Mismo contrato que `useTemplates`: `getAll/save/remove` mas `refreshKey` para
 * que quien lo consuma vuelva a pedir datos cuando cambian desde otra pestaña.
 */
export function useMessageReasons() {
  const { user } = useAuth();

  const subscriptions = useMemo(
    () => [{ channel: 'public:message_reasons', table: 'message_reasons' }],
    []
  );
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const getAll = useCallback(async (): Promise<MessageReason[]> => {
    if (!user) return [];
    return fetchMessageReasons(user.id);
  }, [user]);

  const save = useCallback(
    async (reason: MessageReason): Promise<number> => {
      if (!user) throw new Error('No autenticado');
      const id = await saveMessageReason(user.id, reason);
      triggerRefresh();
      return id;
    },
    [triggerRefresh, user]
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteMessageReason(id);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  return { getAll, save, remove, refreshKey };
}
