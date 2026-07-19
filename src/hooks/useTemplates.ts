import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import {
  deleteTemplate,
  fetchTemplatesByList,
  fetchTemplatesByType,
  getAssignedLeadIds,
  saveTemplateForUser,
  type GenericTemplate,
  type TemplateType,
} from '../services/templatesService';
import type { CallTemplate, EmailTemplate, WhatsAppTemplate } from '../types';

function useGenericTemplates<T extends GenericTemplate>(type: TemplateType) {
  const { user } = useAuth();
  const subscriptions = useMemo(
    () => [{ channel: `public:templates:${type}`, table: 'templates', filter: `type=eq.${type}` }],
    [type]
  );
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const getAll = useCallback(async (): Promise<T[]> => {
    if (!user) return [];
    return fetchTemplatesByType<T>(type);
  }, [type, user]);

  const getByList = useCallback(async (listId: number): Promise<T[]> => {
    if (!user) return [];
    return fetchTemplatesByList<T>(type, listId);
  }, [type, user]);

  const save = useCallback(async (template: T): Promise<string> => {
    if (!user) throw new Error('No autenticado');
    const templateId = await saveTemplateForUser(user.id, type, template);
    triggerRefresh();
    return templateId;
  }, [triggerRefresh, type, user]);

  const remove = useCallback(async (id: string | number): Promise<void> => {
    if (!user) return;
    await deleteTemplate(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  return { getAll, getByList, save, remove, refreshKey };
}

export function useWhatsAppTemplates() {
  return useGenericTemplates<WhatsAppTemplate>('whatsapp');
}

export function useEmailTemplates() {
  return useGenericTemplates<EmailTemplate>('email');
}

export function useCallTemplates() {
  return useGenericTemplates<CallTemplate>('call');
}

export function useWhatsAppTemplateLists() {
  return { getAll: async () => [], save: async (_value: unknown) => 1, remove: async (_id: unknown) => {} };
}

export function useEmailTemplateLists() {
  return { getAll: async () => [], save: async (_value: unknown) => 1, remove: async (_id: unknown) => {} };
}

export function useCallTemplateLists() {
  return { getAll: async () => [], save: async (_value: unknown) => 1, remove: async (_id: unknown) => {} };
}

export async function getAssignedLeads(template: Pick<GenericTemplate, 'leadIds' | 'leadListIds'>, userId: string) {
  return getAssignedLeadIds(template, userId);
}
