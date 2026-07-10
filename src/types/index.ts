export type Page = 'leads' | 'lists' | 'templates' | 'send' | 'history' | 'tasks' | 'dashboard' | 'pipeline' | 'settings';

export type LeadStatus = 'nuevo' | 'contactado' | 'interesado' | 'convertido' | 'descartado';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: '#6b7280',
  contactado: '#3b82f6',
  interesado: '#f59e0b',
  convertido: '#10b981',
  descartado: '#ef4444',
};

export interface Lead {
  id?: number;
  name: string;
  phone: string;       // normalizado: +569XXXXXXXX
  email: string;
  company: string;
  rut: string;          // normalizado: 12345678-9
  notes: string;
  status: LeadStatus;
  listaIds: number[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface LeadList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id?: number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  contenido: string;
  leadIds: number[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface WhatsAppTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface EmailTemplate {
  id?: number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  asunto: string;
  contenido: string;
  isHtml: boolean;
  leadIds: number[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface EmailTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export type ExportFormat = 'json' | 'excel';

export interface AppSettings {
  emailProvider: 'emailjs' | 'resend';
  resendApiKey: string;
  resendFromName: string;
  resendFromEmail: string;
  emailJSUserId: string;
  emailJSServiceId: string;
  emailJSTemplateId: string;
  exportFormat: ExportFormat;
  compactMode: boolean;
  darkMode: boolean;
  visibleCols: { key: string; label: string; visible: boolean }[];
}

export type TaskStatus = 'pendiente' | 'completada';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
};

export interface Task {
  id?: number;
  titulo: string;
  descripcion: string;
  leadIds: number[];
  leadListIds: number[];
  fechaVencimiento: string;  // ISO date
  status: TaskStatus;
  createdAt: string;
}

export interface LeadNote {
  id?: number;
  leadId: number;
  content: string;
  createdAt: string;
}

export interface SendLog {
  id?: number;
  templateId: number;
  templateType: 'whatsapp' | 'email';
  leadId: number;
  leadName: string;
  leadPhone: string;
  sentAt: string;
  scheduledFor?: string;
}
