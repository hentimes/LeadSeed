import { useCallback, useEffect, useId, useState } from 'react';
import { subscribeToTableChanges } from '../repositories/realtimeRepository';
import { buildRealtimeChannelName } from '../utils/realtimeChannel';
import { useAuth } from '../contexts/AuthContext';

export interface RealtimeSubscriptionConfig {
  /** Nombre logico, legible al depurar. Se le agrega ambito e instancia. */
  channel: string;
  table: string;
  filter?: string;
}

/**
 * Devuelve un contador que se incrementa cuando cambia alguna de las tablas
 * observadas, para que el llamador vuelva a pedir sus datos.
 *
 * De este hook cuelgan `useLeads`, `useLists` y `useTemplates`, asi que
 * cualquier cambio aca alcanza a las tres superficies principales.
 */
export function useRealtimeRefresh(subscriptions: RealtimeSubscriptionConfig[]) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  // Identidad estable por instancia del hook. El nombre logico que declara cada
  // llamador (`public:leads`) no alcanza como identificador de canal: dos
  // componentes que monten el mismo hook a la vez colisionarian.
  const instanceId = useId();

  const triggerRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!user || subscriptions.length === 0) {
      return;
    }

    return subscribeToTableChanges(
      subscriptions.map((subscription) => ({
        channelName: buildRealtimeChannelName(subscription.channel, user.id, instanceId),
        table: subscription.table,
        filter: subscription.filter,
      })),
      triggerRefresh,
    );
  }, [subscriptions, triggerRefresh, user, instanceId]);

  return {
    refreshKey,
    triggerRefresh,
  };
}
