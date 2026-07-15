export type Page = 'leads' | 'lists' | 'templates' | 'send' | 'history' | 'tasks' | 'dashboard' | 'pipeline' | 'settings' | 'admin';

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
  id?: string;
  name: string;
  phone: string;       // normalizado: +569XXXXXXXX
  email: string;
  company: string;
  rut: string;          // normalizado: 12345678-9
  notes: string;
  status: LeadStatus;
  listaIds: number[];
  score: number;

  // Campos de Negocio y Marketing (Nuevos)
  scheduledAt?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Métricas de Rendimiento (Nuevos)
  assignedAt?: string;
  firstContactedAt?: string;
  closedAt?: string;
  estimatedValue?: number;
  
  // Datos variables (JSONB)
  metadata?: Record<string, any>;

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
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  contenido: string;
  leadIds: string[];            // leads asignados directamente
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
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  asunto: string;
  contenido: string;
  isHtml: boolean;
  leadIds: string[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface EmailTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface CallTemplate {
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  contenido: string;            // el script de la llamada
  leadIds: string[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface CallTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export type ExportFormat = 'json' | 'excel';

export type ComparePeriod = 'yesterday' | 'lastWeek' | 'lastMonth' | 'lastYear';

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
  
  // Nuevas Metas Diarias
  dailyGoalWhatsApp: number;
  dailyGoalEmail: number;
  dailyGoalCalls: number;
  dashboardComparePeriod: ComparePeriod;
}

export type TaskStatus = 'pendiente' | 'completada';

export interface Task {
  id?: string;
  titulo: string;
  descripcion: string;
  leadIds: string[];
  leadListIds: number[];
  fechaVencimiento: string;  // ISO date
  status: TaskStatus;
  createdAt: string;
}

export interface LeadNote {
  id?: number;
  leadId: string;
  content: string;
  createdAt: string;
}

export interface SendLog {
  id?: number;
  templateId: string | number;
  templateType: 'whatsapp' | 'email' | 'call';
  leadId: string;
  leadName: string;
  leadPhone: string;
  sentAt: string;
  scheduledFor?: string;
}

// SaaS Entitlements
export interface Plan {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trial_days: number;
  created_at: string;
}

export interface PlanFeature {
  plan_id: string;
  feature_id: string;
}

export interface Profile {
  id: string;           // UUID del usuario (auth.users)
  email: string;
  plan_id?: string;
  role: 'admin' | 'user';
  full_name?: string;
  avatar_url?: string;
  last_seen_at?: string;
  created_at: string;
  
  // Billing / Pasarelas de Pago (Mercado Pago, Flow, Stripe)
  gateway_customer_id?: string;
  subscription_id?: string;
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  subscription_end_date?: string;
}

export interface UserFeatureOverride {
  user_id: string;
  feature_id: string;
  expires_at?: string;  // Null = permanente
  created_at: string;
}
