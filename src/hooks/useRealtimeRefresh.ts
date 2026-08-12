import { useCallback, useEffect, useState } from 'react';
// DEUDA 13.4: este hook es el unico que se salta la capa de repositorios, y de el
// cuelgan useLeads, useLists y useTemplates. Mover el canal a un repositorio se hace
// con tests de por medio.
// eslint-disable-next-line no-restricted-imports
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface RealtimeSubscriptionConfig {
  channel: string;
  table: string;
  filter?: string;
}

export function useRealtimeRefresh(subscriptions: RealtimeSubscriptionConfig[]) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const triggerRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!user || subscriptions.length === 0) {
      return;
    }

    const channels = subscriptions.map((subscription) =>
      supabase
        .channel(subscription.channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: subscription.table,
            ...(subscription.filter ? { filter: subscription.filter } : {}),
          },
          triggerRefresh
        )
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions, triggerRefresh, user]);

  return {
    refreshKey,
    triggerRefresh,
  };
}
