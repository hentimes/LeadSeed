import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Lead, LeadStatus } from '../types';
import { normalizePhone } from '../utils/waHelper';
import { useAuth } from '../contexts/AuthContext';

const toTitleCase = (str?: string) => {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Convierte de snake_case (Base de datos) a camelCase (Frontend)
const mapRowToLead = (row: any): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone || '',
  email: row.email || '',
  company: row.company || '',
  rut: row.rut || '',
  status: (row.status as LeadStatus) || 'nuevo',
  score: row.score || 0,
  listaIds: row.lista_ids || [],
  notes: row.notes || '',
  scheduledAt: row.scheduled_at,
  utmSource: row.utm_source,
  utmMedium: row.utm_medium,
  utmCampaign: row.utm_campaign,
  utmTerm: row.utm_term,
  utmContent: row.utm_content,
  assignedAt: row.assigned_at,
  firstContactedAt: row.first_contacted_at,
  closedAt: row.closed_at,
  estimatedValue: row.estimated_value,
  metadata: row.metadata,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

export function useLeads() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Suscripción a WebSockets para actualizaciones en tiempo real
    const channel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getAll = useCallback(async (): Promise<Lead[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    return data.map(mapRowToLead);
  }, [user]);

  const getDeleted = useCallback(async (): Promise<Lead[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data.map(mapRowToLead);
  }, [user]);

  const getById = useCallback(async (id: string): Promise<Lead | undefined> => {
    if (!user) return undefined;
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return mapRowToLead(data);
  }, [user]);

  const getByList = useCallback(async (listaId: number): Promise<Lead[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .contains('lista_ids', [listaId])
      .is('deleted_at', null);
      
    if (error || !data) return [];
    return data.map(mapRowToLead);
  }, [user]);

  const save = useCallback(async (lead: Lead): Promise<string> => {
    if (!user) throw new Error("Usuario no autenticado");
    
    const row = {
      name: toTitleCase(lead.name),
      phone: normalizePhone(lead.phone),
      email: lead.email,
      company: lead.company,
      rut: lead.rut,
      status: lead.status || 'nuevo',
      score: lead.score || 0,
      notes: lead.notes || '',
      scheduled_at: lead.scheduledAt,
      metadata: lead.metadata || {},
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (lead.id) {
      const { error } = await supabase.from('leads').update(row).eq('id', lead.id);
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return lead.id;
    } else {
      const { data, error } = await supabase.from('leads').insert(row).select().single();
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return data.id;
    }
  }, [user]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setRefreshKey(k => k + 1);
  }, [user]);

  const restore = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await supabase.from('leads').update({ deleted_at: null }).eq('id', id);
    setRefreshKey(k => k + 1);
  }, [user]);

  const permanentDelete = useCallback(async (id: string): Promise<void> => {
    if (!user) return;
    await supabase.from('leads').delete().eq('id', id);
    setRefreshKey(k => k + 1);
  }, [user]);

  const purgeOldDeleted = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .lt('deleted_at', cutoff)
      .select();
      
    if (error) return 0;
    if (data && data.length > 0) setRefreshKey(k => k + 1);
    return data?.length || 0;
  }, [user]);

  const importLeads = useCallback(
    async (leads: (Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'listaIds' | 'status'> & { status?: string })[]): Promise<void> => {
      if (!user) return;
      const validStatuses: LeadStatus[] = ['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'];
      
      const rows = leads.map(l => {
        const rawStatus = l.status;
        const normalizedStatus = rawStatus && validStatuses.includes(rawStatus.toLowerCase() as LeadStatus)
          ? rawStatus.toLowerCase() as LeadStatus
          : 'nuevo';
          
        return {
          name: toTitleCase(l.name),
          phone: normalizePhone(l.phone),
          email: l.email,
          company: l.company,
          rut: l.rut,
          status: normalizedStatus,
          notes: l.notes || '',
          user_id: user.id
        };
      });
      
      const { error } = await supabase.from('leads').insert(rows);
      if (error) console.error("Error importando leads:", error);
      else setRefreshKey(k => k + 1);
    },
    [user]
  );

  const addToList = useCallback(async (leadId: string, listaId: number): Promise<void> => {
    if (!user) return;
    try {
      const { data: lead } = await supabase.from('leads').select('lista_ids').eq('id', leadId).single();
      if (lead) {
        const currentList = lead.lista_ids || [];
        if (!currentList.includes(listaId)) {
          await supabase.from('leads').update({
            lista_ids: [...currentList, listaId],
            updated_at: new Date().toISOString()
          }).eq('id', leadId);
          setRefreshKey(k => k + 1);
        }
      }
    } catch (e) {
      console.error('Error en addToList:', e);
    }
  }, [user]);

  const removeFromList = useCallback(async (leadId: string, listaId: number): Promise<void> => {
    if (!user) return;
    try {
      const { data: lead } = await supabase.from('leads').select('lista_ids').eq('id', leadId).single();
      if (lead) {
        const currentList = lead.lista_ids || [];
        await supabase.from('leads').update({
          lista_ids: currentList.filter((id: number) => id !== listaId),
          updated_at: new Date().toISOString()
        }).eq('id', leadId);
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      console.error('Error en removeFromList:', e);
    }
  }, [user]);

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
