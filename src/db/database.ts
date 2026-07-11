import Dexie, { Table } from 'dexie';
import type {
  Lead,
  LeadList,
  LeadNote,
  Task,
  WhatsAppTemplate,
  WhatsAppTemplateList,
  EmailTemplate,
  EmailTemplateList,
  CallTemplate,
  CallTemplateList,
  AppSettings,
  SendLog,
} from '../types';

class LeadsDatabase extends Dexie {
  leads!: Table<Lead, number>;
  leadLists!: Table<LeadList, number>;
  whatsappTemplates!: Table<WhatsAppTemplate, number>;
  whatsappTemplateLists!: Table<WhatsAppTemplateList, number>;
  emailTemplates!: Table<EmailTemplate, number>;
  emailTemplateLists!: Table<EmailTemplateList, number>;
  callTemplates!: Table<CallTemplate, number>;
  callTemplateLists!: Table<CallTemplateList, number>;
  settings!: Table<AppSettings, string>;
  tasks!: Table<Task, number>;
  leadNotes!: Table<LeadNote, number>;
  sendLog!: Table<SendLog, number>;

  constructor() {
    super('LeadsCRM3');

    this.version(1).stores({
      leads: '++id, name, email, phone, company, rut, createdAt, *listaIds',
      leadLists: '++id, name, createdAt',
      whatsappTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      whatsappTemplateLists: '++id, name, createdAt',
      emailTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      emailTemplateLists: '++id, name, createdAt',
      settings: '&emailJSUserId',
      tasks: '++id, fechaVencimiento, status, *leadIds, *leadListIds',
      leadNotes: '++id, leadId, createdAt',
      sendLog: '++id, templateId, leadId, sentAt',
    });

    this.version(2).stores({
      leads: '++id, name, email, phone, company, rut, status, createdAt, *listaIds',
      leadLists: '++id, name, createdAt',
      whatsappTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      whatsappTemplateLists: '++id, name, createdAt',
      emailTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      emailTemplateLists: '++id, name, createdAt',
      settings: '&emailJSUserId',
      tasks: '++id, fechaVencimiento, status, *leadIds, *leadListIds',
      leadNotes: '++id, leadId, createdAt',
      sendLog: '++id, templateId, leadId, sentAt',
    });

    this.version(3).stores({
      leads: '++id, name, email, phone, company, rut, status, createdAt, *listaIds',
      leadLists: '++id, name, createdAt',
      whatsappTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      whatsappTemplateLists: '++id, name, createdAt',
      emailTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      emailTemplateLists: '++id, name, createdAt',
      callTemplates: '++id, *templateListIds, *leadIds, *leadListIds, nombre, createdAt',
      callTemplateLists: '++id, name, createdAt',
      settings: '&emailJSUserId',
      tasks: '++id, fechaVencimiento, status, *leadIds, *leadListIds',
      leadNotes: '++id, leadId, createdAt',
      sendLog: '++id, templateId, leadId, sentAt',
    });
  }
}

export const db = new LeadsDatabase();

// Inicializar settings por defecto
export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get('default');
  return (
    settings || {
      emailProvider: 'emailjs',
      resendApiKey: '',
      resendFromName: 'Acme',
      resendFromEmail: 'onboarding@resend.dev',
      emailJSUserId: '',
      emailJSServiceId: '',
      emailJSTemplateId: '',
      exportFormat: 'json',
      compactMode: true,
      darkMode: false,
      visibleCols: [],
      dailyGoalWhatsApp: 30,
      dailyGoalEmail: 20,
      dailyGoalCalls: 5,
      dashboardComparePeriod: 'yesterday',
    }
  );
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, emailJSUserId: 'default' });
}
