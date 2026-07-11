import { useCallback } from 'react';
import { db } from '../db/database';
import type {
  WhatsAppTemplate,
  WhatsAppTemplateList,
  EmailTemplate,
  EmailTemplateList,
  CallTemplate,
  CallTemplateList,
} from '../types';

// ---------- WhatsApp Templates ----------
export function useWhatsAppTemplates() {
  const getAll = useCallback(async (): Promise<WhatsAppTemplate[]> => {
    return db.whatsappTemplates.orderBy('nombre').toArray();
  }, []);

  const getByList = useCallback(async (listId: number): Promise<WhatsAppTemplate[]> => {
    return db.whatsappTemplates.where('templateListIds').equals(listId).toArray();
  }, []);

  const save = useCallback(async (t: WhatsAppTemplate): Promise<number> => {
    const template = {
      ...t,
      templateListIds: t.templateListIds || [],
      leadIds: t.leadIds || [],
      leadListIds: t.leadListIds || [],
    };
    if (template.id) {
      await db.whatsappTemplates.update(template.id, template);
      return template.id;
    }
    const now = new Date().toISOString();
    const { id: _u1, ...rest } = template;
    const id = await db.whatsappTemplates.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await db.whatsappTemplates.delete(id);
  }, []);

  return { getAll, getByList, save, remove };
}

// ---------- WhatsApp Template Lists ----------
export function useWhatsAppTemplateLists() {
  const getAll = useCallback(async (): Promise<WhatsAppTemplateList[]> => {
    return db.whatsappTemplateLists.orderBy('name').toArray();
  }, []);

  const save = useCallback(async (l: WhatsAppTemplateList): Promise<number> => {
    if (l.id) {
      await db.whatsappTemplateLists.update(l.id, l);
      return l.id;
    }
    const now = new Date().toISOString();
    const { id: _u, ...rest } = l;
    const id = await db.whatsappTemplateLists.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    // Quitar esta categoría de todos los templates que la tengan
    const templates = await db.whatsappTemplates.where('templateListIds').equals(id).toArray();
    for (const t of templates) {
      await db.whatsappTemplates.update(t.id!, {
        templateListIds: t.templateListIds.filter((lid) => lid !== id),
      });
    }
    await db.whatsappTemplateLists.delete(id);
  }, []);

  return { getAll, save, remove };
}

// ---------- Email Templates ----------
export function useEmailTemplates() {
  const getAll = useCallback(async (): Promise<EmailTemplate[]> => {
    return db.emailTemplates.orderBy('nombre').toArray();
  }, []);

  const getByList = useCallback(async (listId: number): Promise<EmailTemplate[]> => {
    return db.emailTemplates.where('templateListIds').equals(listId).toArray();
  }, []);

  const save = useCallback(async (t: EmailTemplate): Promise<number> => {
    const template = {
      ...t,
      templateListIds: t.templateListIds || [],
      leadIds: t.leadIds || [],
      leadListIds: t.leadListIds || [],
    };
    if (template.id) {
      await db.emailTemplates.update(template.id, template);
      return template.id;
    }
    const now = new Date().toISOString();
    const { id: _u2, ...rest } = template;
    const id = await db.emailTemplates.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await db.emailTemplates.delete(id);
  }, []);

  return { getAll, getByList, save, remove };
}

// ---------- Email Template Lists ----------
export function useEmailTemplateLists() {
  const getAll = useCallback(async (): Promise<EmailTemplateList[]> => {
    return db.emailTemplateLists.orderBy('name').toArray();
  }, []);

  const save = useCallback(async (l: EmailTemplateList): Promise<number> => {
    if (l.id) {
      await db.emailTemplateLists.update(l.id, l);
      return l.id;
    }
    const now = new Date().toISOString();
    const { id: _u3, ...rest } = l;
    const id = await db.emailTemplateLists.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    const templates = await db.emailTemplates.where('templateListIds').equals(id).toArray();
    for (const t of templates) {
      await db.emailTemplates.update(t.id!, {
        templateListIds: t.templateListIds.filter((lid: number) => lid !== id),
      });
    }
    await db.emailTemplateLists.delete(id);
  }, []);

  return { getAll, save, remove };
}

// ---------- Call Templates ----------
export function useCallTemplates() {
  const getAll = useCallback(async (): Promise<CallTemplate[]> => {
    return db.callTemplates.orderBy('nombre').toArray();
  }, []);

  const getByList = useCallback(async (listId: number): Promise<CallTemplate[]> => {
    return db.callTemplates.where('templateListIds').equals(listId).toArray();
  }, []);

  const save = useCallback(async (t: CallTemplate): Promise<number> => {
    const template = {
      ...t,
      templateListIds: t.templateListIds || [],
      leadIds: t.leadIds || [],
      leadListIds: t.leadListIds || [],
    };
    if (template.id) {
      await db.callTemplates.update(template.id, template);
      return template.id;
    }
    const now = new Date().toISOString();
    const { id: _u2, ...rest } = template;
    const id = await db.callTemplates.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await db.callTemplates.delete(id);
  }, []);

  return { getAll, getByList, save, remove };
}

// ---------- Call Template Lists ----------
export function useCallTemplateLists() {
  const getAll = useCallback(async (): Promise<CallTemplateList[]> => {
    return db.callTemplateLists.orderBy('name').toArray();
  }, []);

  const save = useCallback(async (l: CallTemplateList): Promise<number> => {
    if (l.id) {
      await db.callTemplateLists.update(l.id, l);
      return l.id;
    }
    const now = new Date().toISOString();
    const { id: _u3, ...rest } = l;
    const id = await db.callTemplateLists.add({ ...rest, createdAt: now });
    return id as number;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    const templates = await db.callTemplates.where('templateListIds').equals(id).toArray();
    for (const t of templates) {
      await db.callTemplates.update(t.id!, {
        templateListIds: t.templateListIds.filter((lid: number) => lid !== id),
      });
    }
    await db.callTemplateLists.delete(id);
  }, []);

  return { getAll, save, remove };
}

// ---------- Helper: get leads assigned to a template (direct + from lists) ----------
export async function getAssignedLeads(
  template: WhatsAppTemplate | EmailTemplate | CallTemplate
): Promise<{ directIds: number[]; fromListsIds: number[]; allIds: number[] }> {
  const directIds = template.leadIds || [];

  const listLeadIds: number[] = [];
  if (template.leadListIds && template.leadListIds.length > 0) {
    const leads = await db.leads.toArray();
    for (const lead of leads) {
      if (lead.listaIds.some((lid) => template.leadListIds.includes(lid))) {
        if (!directIds.includes(lead.id!)) {
          listLeadIds.push(lead.id!);
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
