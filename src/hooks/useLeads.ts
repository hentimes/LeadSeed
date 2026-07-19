import { useCallback } from 'react';
import type { Lead } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLeadRealtimeRefresh } from './useLeadRealtimeRefresh';
import {
  addLeadToList,
  fetchActiveLeads,
  fetchDeletedLeads,
  fetchLeadById,
  fetchLeadsByList,
  importLeadsForUser,
  permanentlyDeleteLead,
  purgeDeletedLeadsForUser,
  removeLeadFromList,
  restoreLead as restoreLeadById,
  saveLeadForUser,
  softDeleteLead,
} from '../services/leadsService';

export function useLeads() {
  const { user } = useAuth();
  const { refreshKey, triggerRefresh } = useLeadRealtimeRefresh();

  const getAll = useCallback(async (): Promise<Lead[]> => {
    if (!user) return [];
    return fetchActiveLeads(user.id);
  }, [user]);

  const getDeleted = useCallback(async (): Promise<Lead[]> => {
    if (!user) return [];
    return fetchDeletedLeads(user.id);
  }, [user]);

  const getById = useCallback(async (id: string): Promise<Lead | undefined> => {
    if (!user) return undefined;
    return fetchLeadById(id);
  }, [user]);

  const getByList = useCallback(async (listaId: number): Promise<Lead[]> => {
    if (!user) return [];
    return fetchLeadsByList(listaId);
  }, [user]);

  const save = useCallback(async (lead: Lead): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');
    const leadId = await saveLeadForUser(user.id, lead);
    triggerRefresh();
    return leadId;
  }, [triggerRefresh, user]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await softDeleteLead(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  const restore = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await restoreLeadById(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  const permanentDelete = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await permanentlyDeleteLead(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  const purgeOldDeleted = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const deletedCount = await purgeDeletedLeadsForUser(user.id);
    if (deletedCount > 0) {
      triggerRefresh();
    }
    return deletedCount;
  }, [triggerRefresh, user]);

  const importLeads = useCallback(
    async (
      leads: (Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'listaIds' | 'status'> & { status?: string })[]
    ): Promise<void> => {
      if (!user) return;
      await importLeadsForUser(user.id, leads);
      triggerRefresh();
    },
    [triggerRefresh, user]
  );

  const addToList = useCallback(async (leadId: string, listaId: number): Promise<void> => {
    if (!user) return;
    const changed = await addLeadToList(leadId, listaId);
    if (changed) {
      triggerRefresh();
    }
  }, [triggerRefresh, user]);

  const removeFromList = useCallback(async (leadId: string, listaId: number): Promise<void> => {
    if (!user) return;
    const changed = await removeLeadFromList(leadId, listaId);
    if (changed) {
      triggerRefresh();
    }
  }, [triggerRefresh, user]);

  return {
    getAll,
    getDeleted,
    getById,
    getByList,
    save,
    remove,
    restore,
    permanentDelete,
    purgeOldDeleted,
    importLeads,
    addToList,
    removeFromList,
    refreshKey,
  };
}
