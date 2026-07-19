import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { LeadList } from '../types';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import { deleteLeadList, fetchLeadLists, saveLeadList } from '../services/listsService';

export function useLists() {
  const { user } = useAuth();
  const subscriptions = useMemo(() => [{ channel: 'public:lead_lists', table: 'lead_lists' }], []);
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const getAll = useCallback(async (): Promise<LeadList[]> => {
    if (!user) return [];
    return fetchLeadLists(user.id);
  }, [user]);

  const save = useCallback(async (list: LeadList): Promise<number> => {
    if (!user) throw new Error('No autenticado');
    const listId = await saveLeadList(user.id, list);
    triggerRefresh();
    return listId;
  }, [triggerRefresh, user]);

  const remove = useCallback(async (id: number): Promise<void> => {
    if (!user) return;
    await deleteLeadList(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  return { getAll, save, remove, refreshKey };
}
