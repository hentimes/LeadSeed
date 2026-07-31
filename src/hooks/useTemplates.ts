import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import { deleteTemplateList, fetchTemplateLists, saveTemplateList, type TemplateList } from '../services/templateListsService';
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

function useGenericTemplateLists(type: TemplateType) {
  const { user } = useAuth();
  const subscriptions = useMemo(
    () => [{ channel: `public:template_lists:${type}`, table: 'template_lists', filter: `type=eq.${type}` }],
    [type]
  );
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const getAll = useCallback(async (): Promise<TemplateList[]> => {
    if (!user) return [];
    return fetchTemplateLists(user.id, type);
  }, [type, user]);

  const save = useCallback(async (list: TemplateList): Promise<number> => {
    if (!user) throw new Error('No autenticado');
    const listId = await saveTemplateList(user.id, type, list);
    triggerRefresh();
    return listId;
  }, [triggerRefresh, type, user]);

  const remove = useCallback(async (id: number): Promise<void> => {
    if (!user) return;
    await deleteTemplateList(id);
    triggerRefresh();
  }, [triggerRefresh, user]);

  return { getAll, save, remove, refreshKey };
}

export function useWhatsAppTemplateLists() {
  return useGenericTemplateLists('whatsapp');
}

export function useEmailTemplateLists() {
  return useGenericTemplateLists('email');
}

export function useCallTemplateLists() {
  return useGenericTemplateLists('call');
}

export async function getAssignedLeads(template: Pick<GenericTemplate, 'leadIds' | 'leadListIds'>, userId: string) {
  return getAssignedLeadIds(template, userId);
}
