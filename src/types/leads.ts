import { STATE } from '../design/colors';

export type LeadStatus = 'nuevo' | 'contactado' | 'interesado' | 'convertido' | 'descartado';

/**
 * Las cuatro etapas reales del pipeline, que son las del tablero.
 *
 * 'nuevo' queda fuera a proposito: no es una etapa sino la ausencia de una
 * ("todavia no lo gestione"). Se muestra y se puede filtrar, pero no se
 * asigna a mano, porque un lead ya gestionado no vuelve a estar sin gestionar.
 * Lo apaga solo el trigger de la migracion 062 al escribirle o agendarle algo.
 */
export const PIPELINE_STAGES = ['contactado', 'interesado', 'convertido', 'descartado'] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  // 'nuevo' y 'convertido' no tienen token equivalente: son un gris neutro y un
  // verde mas frio que --ls-success. Se dejan literales en vez de forzar una
  // correspondencia que no existe.
  nuevo: '#6b7280',
  contactado: STATE.info,
  interesado: STATE.warning,
  convertido: '#10b981',
  descartado: STATE.danger,
};

/** Canal de captura del lead. 'general' incluye tambien el formulario /form. */
export type LeadSourceChannel = 'pb' | 'general' | 'retiro';

export const SOURCE_CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  pb: 'PB',
  general: 'General',
  retiro: 'Retiro',
};

export const SOURCE_CHANNEL_COLORS: Record<LeadSourceChannel, string> = {
  pb: STATE.info,
  general: '#6b7280',
  retiro: '#a855f7',
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
  /** manual | imported | web_form. Migracion 069. */
  origin?: 'manual' | 'imported' | 'web_form';
  source_system?: string;
  source_channel?: LeadSourceChannel | string;
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

/**
 * Estado de visibilidad de una columna de la bandeja.
 *
 * Vivia dentro de `components/ColumnSelector.tsx`, lo que invertia la
 * dependencia: `services/appSettings.ts` y `config/leadColumns.ts` tenian que
 * importar del arbol de UI para conocer un tipo de dominio, y con el se
 * arrastraban a cualquier consumidor. Ver roadmap 13.4.
 *
 * No confundir con `LeadColumnDef` de `config/leadColumns.ts`, que describe la
 * columna completa (ancho, campo de orden, si es fija). Este solo representa
 * que columnas ve el usuario y en que orden.
 */
export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
}
