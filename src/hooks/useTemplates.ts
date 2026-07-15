import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type {
  WhatsAppTemplate,
  WhatsAppTemplateList,
  EmailTemplate,
  EmailTemplateList,
  CallTemplate,
  CallTemplateList,
} from '../types';

// En Supabase, usamos una única tabla 'templates' con la columna 'type' ('whatsapp', 'email', 'call')
// Mapeos para adaptar el frontend (camelCase) a la BD (snake_case)

const mapToFrontend = (row: any) => {
  return {
    id: row.id,
    nombre: row.name,
    contenido: row.content,
    asunto: row.subject, // Solo para email
    isHtml: row.is_html || false, // Solo para email
    templateListIds: row.template_list_ids || [],
    leadIds: row.lead_ids || [],
    leadListIds: row.lead_list_ids || [],
    createdAt: row.created_at
  };
};

const mapToDb = (t: any, type: string, userId: string) => {
  return {
    user_id: userId,
    type: type,
    name: t.nombre,
    content: t.contenido || t.texto || '', // Soporte legacy
    subject: t.asunto || null,
    is_html: t.isHtml || false,
    template_list_ids: t.templateListIds || [],
    lead_ids: t.leadIds || [],
    lead_list_ids: t.leadListIds || [],
    updated_at: new Date().toISOString()
  };
};

// ---------- Hooks Base Genérico ----------
function useGenericTemplates<T>(type: 'whatsapp' | 'email' | 'call') {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`public:templates:${type}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates', filter: `type=eq.${type}` }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, type]);

  const getAll = useCallback(async (): Promise<T[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('type', type)
      .order('name');
    if (error) return [];
    return data.map(mapToFrontend) as unknown as T[];
  }, [user, type]);

  const getByList = useCallback(async (listId: number): Promise<T[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('type', type)
      .contains('template_list_ids', [listId])
      .order('name');
    if (error) return [];
    return data.map(mapToFrontend) as unknown as T[];
  }, [user, type]);

  const save = useCallback(async (t: any): Promise<string> => {
    if (!user) throw new Error("No autenticado");
    const payload = mapToDb(t, type, user.id);
    
    if (t.id && typeof t.id === 'string') {
      const { error } = await supabase.from('templates').update(payload).eq('id', t.id);
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return t.id;
    } else {
      // Create
      const { data, error } = await supabase.from('templates').insert({
        ...payload,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      setRefreshKey(k => k + 1);
      return data.id;
    }
  }, [user, type]);

  const remove = useCallback(async (id: string | number): Promise<void> => {
    if (!user) return;
    await supabase.from('templates').delete().eq('id', id);
    setRefreshKey(k => k + 1);
  }, [user]);

  return { getAll, getByList, save, remove, refreshKey };
}


// ---------- WhatsApp Templates ----------
export function useWhatsAppTemplates() {
  return useGenericTemplates<WhatsAppTemplate>('whatsapp');
}

// ---------- Email Templates ----------
export function useEmailTemplates() {
  return useGenericTemplates<EmailTemplate>('email');
}

// ---------- Call Templates ----------
export function useCallTemplates() {
  return useGenericTemplates<CallTemplate>('call');
}

// ---------- Mock Hooks para las Listas (Carpetas) por ahora ----------
// Como no hemos migrado template_lists a Supabase aún, 
// devolveremos arreglos vacíos temporalmente para que no crashee la UI.
export function useWhatsAppTemplateLists() {
  return { getAll: async () => [], save: async (v: any) => 1, remove: async (id: any) => {} };
}
export function useEmailTemplateLists() {
  return { getAll: async () => [], save: async (v: any) => 1, remove: async (id: any) => {} };
}
export function useCallTemplateLists() {
  return { getAll: async () => [], save: async (v: any) => 1, remove: async (id: any) => {} };
}

// ---------- Helper: get leads assigned to a template ----------
export async function getAssignedLeads(
  template: any
): Promise<{ directIds: string[]; fromListsIds: string[]; allIds: string[] }> {
  const directIds = template.leadIds || [];
  const listLeadIds: string[] = [];
  
  if (template.leadListIds && template.leadListIds.length > 0) {
    const { data: leads } = await supabase.from('leads').select('id, lista_ids');
    if (leads) {
      for (const lead of leads) {
        if (lead.lista_ids && lead.lista_ids.some((lid: number) => template.leadListIds.includes(lid))) {
          if (!directIds.includes(lead.id)) {
            listLeadIds.push(lead.id);
          }
        }
      }
    }
  }

  return {
    directIds,
    fromListsIds: listLeadIds,
    allIds: [...new Set([...directIds, ...listLeadIds])],
  };
}
