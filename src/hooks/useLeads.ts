import { useCallback, useState } from 'react';
import { db } from '../db/database';
import type { Lead, LeadStatus } from '../types';
import { normalizePhone } from '../utils/waHelper';

export function useLeads() {
  const [refreshKey, setRefreshKey] = useState(0);

  const getAll = useCallback(async (): Promise<Lead[]> => {
    return await db.leads.orderBy('createdAt').reverse().filter((l) => !l.deletedAt).toArray();
  }, []);

  const getDeleted = useCallback(async (): Promise<Lead[]> => {
    return await db.leads.orderBy('createdAt').reverse().filter((l) => !!l.deletedAt).toArray();
  }, []);

  const getById = useCallback(async (id: number): Promise<Lead | undefined> => {
    return db.leads.get(id);
  }, []);

  const getByList = useCallback(async (listaId: number): Promise<Lead[]> => {
    const leads = await db.leads.where('listaIds').equals(listaId).toArray();
    return leads.filter((l) => !l.deletedAt);
  }, []);

  const save = useCallback(async (lead: Lead): Promise<number> => {
    const now = new Date().toISOString();
    const normalized = { ...lead, phone: normalizePhone(lead.phone), status: lead.status || 'nuevo' };
    if (lead.id) {
      await db.leads.update(lead.id, { ...normalized, updatedAt: now });
      return lead.id;
    }
    const id = await db.leads.add({
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await db.leads.update(id, { deletedAt: new Date().toISOString() });
  }, []);

  const restore = useCallback(async (id: number): Promise<void> => {
    await db.leads.update(id, { deletedAt: undefined as any });
  }, []);

  const permanentDelete = useCallback(async (id: number): Promise<void> => {
    await db.leads.delete(id);
  }, []);

  const purgeOldDeleted = useCallback(async (): Promise<number> => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const old = await db.leads.filter((l) => !!(l.deletedAt && l.deletedAt < cutoff)).toArray();
    for (const l of old) await db.leads.delete(l.id!);
    return old.length;
  }, []);

  const importLeads = useCallback(
    async (leads: (Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'listaIds' | 'status'> & { status?: string })[]): Promise<void> => {
      const now = new Date().toISOString();
      const validStatuses: LeadStatus[] = ['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'];
      const toAdd = leads.map((l) => {
        const { status: rawStatus, ...rest } = l;
        const normalizedStatus: LeadStatus = rawStatus && validStatuses.includes(rawStatus.toLowerCase() as LeadStatus)
          ? rawStatus.toLowerCase() as LeadStatus
          : 'nuevo';
        return {
          ...rest,
          phone: normalizePhone(l.phone),
          status: normalizedStatus,
          listaIds: [],
          createdAt: now,
          updatedAt: now,
        };
      });
      await db.leads.bulkAdd(toAdd);
      setRefreshKey((k) => k + 1);
    },
    []
  );

  const addToList = useCallback(async (leadId: number, listaId: number): Promise<void> => {
    try {
      const lead = await db.leads.get(leadId);
      if (lead && !lead.listaIds.includes(listaId)) {
        await db.leads.update(leadId, {
          listaIds: [...lead.listaIds, listaId],
          updatedAt: new Date().toISOString(),
        });
        console.log('Lead', leadId, 'agregado a lista', listaId);
      }
    } catch (e) {
      console.error('Error en addToList:', e);
    }
  }, []);

  const removeFromList = useCallback(async (leadId: number, listaId: number): Promise<void> => {
    const lead = await db.leads.get(leadId);
    if (lead) {
      await db.leads.update(leadId, {
        listaIds: lead.listaIds.filter((id) => id !== listaId),
        updatedAt: new Date().toISOString(),
      });
    }
  }, []);

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
