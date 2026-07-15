import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { LeadList } from '../types';

export function useLists() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public:lists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getAll = useCallback(async (): Promise<LeadList[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
      
    if (error) return [];
    return data.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      createdAt: r.created_at
    })) as unknown as LeadList[];
  }, [user]);

  const save = useCallback(async (list: LeadList): Promise<number> => {
    if (!user) throw new Error("No autenticado");
    
    if (list.id) {
      const { error } = await supabase.from('lists').update({
        name: list.name,
        color: list.color,
        updated_at: new Date().toISOString()
      }).eq('id', list.id);
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return list.id as number;
    } else {
      const { data, error } = await supabase.from('lists').insert({
        user_id: user.id,
        name: list.name,
        color: list.color,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return data.id as number;
    }
  }, [user]);

  const remove = useCallback(async (id: number): Promise<void> => {
    if (!user) return;
    await supabase.from('lists').delete().eq('id', id);
    setRefreshKey(k => k + 1);
  }, [user]);

  return { getAll, save, remove, refreshKey };
}
