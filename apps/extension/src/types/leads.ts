
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

/**
 * QUE HAY QUE HACER EN CADA ETAPA, Y CUANDO SE CONSIDERA TRABADO.
 *
 * La idea viene de la matriz de Eisenhower: alli el cuadrante no dice donde
 * esta la tarea, dice QUE HACER con ella -hacer, programar, delegar, eliminar-.
 * Nuestros cuadrantes solo decian donde estaba el lead.
 *
 * `dias` es a partir de cuantos dias sin moverse el lead se considera trabado.
 * Es la adaptacion del consejo de "limitá a 10 elementos por cuadrante": el
 * limite literal no aplica -no se puede capar cuantos leads hay en una etapa-,
 * pero la intuicion de abajo si: una etapa desbordada avisa de que algo no
 * avanza. En vez de un tope, un aviso.
 *
 * Los plazos son un punto de partida y estan pensados para revisarse con datos
 * reales, no son una verdad del negocio.
 *
 * 'convertido' y 'descartado' no llevan ninguno de los dos: son finales. Un
 * lead cerrado no esta trabado por llevar tiempo cerrado.
 */
export const STAGE_ACTIONS: Record<PipelineStage, { verbo: string; dias: number | null }> = {
  contactado: { verbo: 'Hacer seguimiento', dias: 7 },
  interesado: { verbo: 'Cerrar', dias: 14 },
  convertido: { verbo: '', dias: null },
  descartado: { verbo: '', dias: null },
};

/** Canal de captura del lead. 'general' incluye tambien el formulario /form. */
export type LeadSourceChannel = 'pb' | 'general' | 'retiro';

export const SOURCE_CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  pb: 'PB',
  general: 'General',
  retiro: 'Retiro',
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
  /** Motivo por el que se descarto. Solo tiene sentido con status 'descartado'. */
  discardReason?: string;
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
  /**
   * Nulo cuando el mensaje no salio de una plantilla: el boton de WhatsApp de
   * la ficha del lead abre el chat vacio.
   */
  templateId: string | number | null;
  templateType: 'whatsapp' | 'email' | 'call';
  leadId: string;
  leadName: string;
  leadPhone: string;
  sentAt: string;
  scheduledFor?: string;
  /**
   * Lo que realmente se envio, guardado en el momento del envio.
   *
   * Sin esto el historial reconstruia el mensaje buscando la plantilla por id,
   * asi que perdia el texto al borrarla y mostraba el texto nuevo al editarla.
   * Queda indefinido en los envios anteriores a la migracion 106.
   */
  templateName?: string;
  content?: string;
  subject?: string;
  isHtml?: boolean;
  /**
   * Cuando se marco como eliminada en el historial (migracion 135).
   *
   * El envio NO deja de existir: la fila se sigue viendo como lapida y sigue
   * contando en los contadores del lead y en las metricas. Lo unico que se
   * oculta es el contenido.
   */
  deletedAt?: string;
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
