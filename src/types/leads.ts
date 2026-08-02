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
  paso1_motivo?: string;
  paso1_necesidad?: string;
  paso1_objetivo?: string;
  paso1_grupo?: string;
  paso1_resumen?: string;
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

export interface PlanesproIntakeJourneyStep1 {
  version?: string;
  motivo?: string;
  necesidad?: string;
  objetivo?: string;
  grupo?: string;
  resumen?: string;
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
  intake_journey?: {
    step1?: PlanesproIntakeJourneyStep1;
    [key: string]: unknown;
  };
  raw_payload?: PlanesproLeadRawPayload;
  [key: string]: unknown;
}

export type LeadMetadata = Record<string, unknown> & Partial<PlanesproLeadMetadata>;

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
  isPinned?: boolean;
  /** El detalle del lead todavia no fue abierto. */
  isUnread?: boolean;

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

export interface AdminObservedLeadAlert {
  observedUserId: string;
  unseenNewLeadsCount: number;
  latestLeadCreatedAt?: string;
}
