import { useCallback } from 'react';
import { db } from '../db/database';
import type { LeadList } from '../types';

export function useLists() {
  const getAll = useCallback(async (): Promise<LeadList[]> => {
    return db.leadLists.orderBy('name').toArray();
  }, []);

  const save = useCallback(async (list: LeadList): Promise<number> => {
    console.log('useLists.save called with:', list);
    try {
      if (list.id) {
        await db.leadLists.update(list.id, list);
        console.log('useLists.save: updated', list.id);
        return list.id;
      }
      const now = new Date().toISOString();
      const { id: _unused, ...rest } = list;
      const obj = { ...rest, createdAt: now };
      console.log('useLists.save: adding', obj);
      const id = await db.leadLists.add(obj);
      console.log('useLists.save: added with id', id);
      return id as number;
    } catch (e) {
      console.error('useLists.save error:', e);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await db.leadLists.delete(id);
    // Quitar esta lista de todos los leads que la tengan
    const leads = await db.leads.where('listaIds').equals(id).toArray();
    for (const lead of leads) {
      await db.leads.update(lead.id!, {
        listaIds: lead.listaIds.filter((lid) => lid !== id),
      });
    }
  }, []);

  return { getAll, save, remove };
}
