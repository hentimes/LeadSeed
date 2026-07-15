import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Lead } from '../types';

export interface DuplicatePair {
  lead1: Lead;
  lead2: Lead;
  reason: string;
}

export function useDuplicates() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [mergeMsg, setMergeMsg] = useState('');

  const findDuplicates = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data: leadsData } = await supabase.from('leads').select('*').eq('user_id', userId).is('deleted_at', null);
    
    const active = (leadsData || []).map(l => ({ ...l, id: l.id, name: l.name, phone: l.phone, rut: l.rut, listaIds: l.lista_ids }));
    
    const found: DuplicatePair[] = [];
    const seenRut = new Map<string, number>();
    const seenPhone = new Map<string, number>();

    for (let i = 0; i < active.length; i++) {
      const l = active[i];
      if (l.rut && seenRut.has(l.rut)) {
        found.push({ lead1: active[seenRut.get(l.rut)!], lead2: l, reason: `RUT: ${l.rut}` });
      } else if (l.rut) {
        seenRut.set(l.rut, i);
      }
      const phone = l.phone?.replace(/[^+\d]/g, '');
      if (phone && seenPhone.has(phone)) {
        found.push({ lead1: active[seenPhone.get(phone)!], lead2: l, reason: `Teléfono: ${l.phone}` });
      } else if (phone) {
        seenPhone.set(phone, i);
      }
    }
    setDuplicates(found);
  }, []);

  const mergeLeads = useCallback(async (lead1: Lead, lead2: Lead) => {
    const mergedLists = [...new Set([...(lead1.listaIds || []), ...(lead2.listaIds || [])])];
    const mergedNotes = [lead1.notes, lead2.notes].filter(Boolean).join(' | ');
    const best: Partial<Lead> = {
      name: lead1.name || lead2.name,
      phone: lead1.phone || lead2.phone,
      email: lead1.email || lead2.email,
      company: lead1.company || lead2.company,
      rut: lead1.rut || lead2.rut,
      notes: mergedNotes,
      status: (lead1.status !== 'nuevo' ? lead1.status : lead2.status) || 'nuevo',
      listaIds: mergedLists,
      updatedAt: new Date().toISOString(),
    };
    
    await supabase.from('leads').update(best).eq('id', lead1.id);
    
    // Merge Notes
    await supabase.from('lead_notes').update({ lead_id: lead1.id }).eq('lead_id', lead2.id);
    
    // Merge Send Logs
    await supabase.from('send_logs').update({ lead_id: lead1.id }).eq('lead_id', lead2.id);
    
    await supabase.from('leads').delete().eq('id', lead2.id);
    
    setMergeMsg(`Unidos: ${lead2.name} → ${lead1.name}`);
    setTimeout(() => setMergeMsg(''), 3000);
    findDuplicates();
  }, [findDuplicates]);

  return {
    duplicates,
    mergeMsg,
    findDuplicates,
    mergeLeads,
  };
}
