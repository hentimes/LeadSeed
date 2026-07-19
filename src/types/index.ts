export type Page = 'leads' | 'lists' | 'templates' | 'send' | 'history' | 'tasks' | 'dashboard' | 'pipeline' | 'agenda' | 'settings' | 'community' | 'support' | 'admin' | 'chat';

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

export interface PlanesproLeadRawPayload {
  sistema_actual?: string;
  rango_renta?: string;
  rango_edad?: string;
  region?: string;
  comuna?: string;
  isapre_especifica?: string;
  numero_cargas?: string;
  edad_cargas?: string | number[] | string[];
  contacto_preferencia?: string;
  comentarios?: string;
  comentario?: string;
  cita_estado?: string;
  cita_fecha_hora?: string;
  [key: string]: unknown;
}

export interface PlanesproLeadMetadata {
  source_system?: string;
  source_channel?: string;
  source_form_variant?: string;
  source_hostname?: string;
  source_path?: string;
  source_url?: string;
  capture_ref?: string | null;
  first_touch_ref?: string | null;
  capture_link_id?: string | number | null;
  capture_link_name?: string | null;
  capture_campaign?: string | null;
  pdf_path?: string | null;
  pdf_filename?: string | null;
  pdf_content_type?: string | null;
  pdf_size?: number | null;
  appointment_status?: string | null;
  contact_preference?: string | null;
  advisor_id?: string | null;
  raw_payload?: PlanesproLeadRawPayload;
  [key: string]: unknown;
}

export type LeadMetadata = Record<string, unknown> & Partial<PlanesproLeadMetadata>;

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
  metadata?: LeadMetadata;
  crossExecAlerts?: LeadCrossExecEvent[];
  hasUnreadCrossExecAlert?: boolean;
  crossExecPriorityAt?: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type LeadCrossExecEventKind = 'captured_previously' | 'contacted_other_executive';

export interface LeadCrossExecEvent {
  id: string;
  leadId: string;
  relatedLeadId: string;
  eventKind: LeadCrossExecEventKind;
  counterpartCapturedAt: string;
  matchedBy: string[];
  isRead: boolean;
  createdAt: string;
}

export interface CaptureLink {
  id: number;
  refCode: string;
  label: string;
  campaignName: string;
  isDefault: boolean;
  isActive: boolean;
  statsConfig: Record<string, unknown>;
  totalLeads: number;
  closedLeads: number;
  closeRatePct: number;
  captureLinksLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureLinkStats {
  captureLinkId: number;
  refCode: string;
  linkName: string;
  campaignName: string;
  totalLeads: number;
  closedLeads: number;
  closeRatePct: number;
  ageRange: string;
  incomeRange: string;
  region: string;
  healthSystem: string;
  healthProvider: string;
  leadsCount: number;
}

export interface CaptureLinkInput {
  label: string;
  campaignName?: string;
  isActive?: boolean;
  isDefault?: boolean;
  statsConfig?: Record<string, unknown>;
}

export interface CalendarSettings {
  userId: string;
  timezone: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  allowPublicBooking: boolean;
  googleCalendarId: string;
  updatedAt: string;
}

export interface CalendarConnectionStatus {
  provider: string;
  googleEmail: string;
  calendarId: string;
  connectedAt?: string;
  tokenScope: string;
  tokenExpiresAt?: string;
  lastSyncStartedAt?: string;
  lastSyncFinishedAt?: string;
  lastSyncStatus: 'idle' | 'running' | 'ok' | 'error';
  lastSyncError: string;
  isConnected: boolean;
}

export interface GoogleCalendarSyncResult {
  ok: boolean;
  source: string;
  calendarId: string;
  from: string;
  to: string;
  busyCount: number;
}

export interface AvailabilityRule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AvailabilityBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  blockType: 'manual' | 'full_day' | 'google' | 'system';
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaAppointment {
  id: string;
  leadId?: string;
  leadName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  sourceChannel: string;
  captureRef?: string;
  notes: string;
  meetLink?: string;
  googleEventId?: string;
  googleSyncStatus?: string;
  googleSyncError?: string;
  googleSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentAuditEvent {
  id: string;
  appointmentId: string;
  eventType: 'created_from_lead' | 'rescheduled' | 'cancelled' | 'google_sync_error' | 'participant_added' | 'participant_removed';
  previousStatus?: string;
  nextStatus?: string;
  previousStartTime?: string;
  nextStartTime?: string;
  previousEndTime?: string;
  nextEndTime?: string;
  note: string;
  createdAt: string;
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  email: string;
  name: string;
  participantRole: 'guest' | 'lead' | 'internal';
  invitationStatus: 'pending' | 'synced' | 'error' | 'skipped';
  googleSyncError: string;
  googleSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentParticipantInput {
  appointmentId: string;
  email: string;
  name?: string;
  participantRole?: 'guest' | 'lead' | 'internal';
}

export interface LeadAppointmentInput {
  leadId: string;
  startsAt: string;
  note?: string;
}

export interface GoogleCalendarCreateEventResult {
  ok: boolean;
  status: 'synced' | 'skipped' | 'error' | 'already_synced';
  googleEventId?: string;
  meetLink?: string;
  reason?: string;
}

export interface GoogleCalendarAttendeesSyncResult {
  ok: boolean;
  status: 'synced' | 'skipped';
  reason?: string;
  attendeesCount: number;
}

export interface AppointmentMutationResult {
  appointment: AgendaAppointment;
  googleSyncStatus: 'synced' | 'skipped' | 'error';
  googleSyncError?: string;
}

export interface AvailabilityRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityBlockInput {
  startsAt: string;
  endsAt: string;
  blockType?: 'manual' | 'full_day';
  note?: string;
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
  
  // Comunidad y Gamificación
  bio?: string;
  show_premium_frame?: boolean;
  is_invisible?: boolean;
  badges?: string[];
  is_helper?: boolean;
  
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

export type RequirementType = 'soporte' | 'facturacion' | 'bug' | 'sugerencia' | 'otro';
export type RequirementStatus = 'open' | 'in_progress' | 'closed' | 'claim' | 'archived';
export type RequirementRating = 'up' | 'down';

export interface Requirement {
  id: string;
  ticket_code?: string;
  user_id: string;
  helper_id?: string;
  type: RequirementType;
  content: string;
  status: RequirementStatus;
  rating?: RequirementRating;
  claim_reason?: string;
  bump_count?: number;
  last_bumped_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones cargadas por Supabase
  user_profile?: Profile;
  helper_profile?: Profile;
}

export interface ChatRoom {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reply_to_id?: string;
  created_at: string;

  // Joins
  user_profile?: Profile;
  reply_to_message?: ChatMessage;
}
