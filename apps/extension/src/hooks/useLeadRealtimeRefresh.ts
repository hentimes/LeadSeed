import { useMemo } from 'react';
import { useRealtimeRefresh } from './useRealtimeRefresh';

export function useLeadRealtimeRefresh() {
  const subscriptions = useMemo(
    () => [
      { channel: 'public:leads', table: 'leads' },
      { channel: 'public:lead_cross_exec_events', table: 'lead_cross_exec_events' },
    ],
    []
  );

  return useRealtimeRefresh(subscriptions);
}
