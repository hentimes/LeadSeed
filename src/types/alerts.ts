export type LeadAlertEventKind = 'lead_created';

export interface LeadAlertEvent {
  id: string;
  targetUserId: string;
  leadId: string;
  eventKind: LeadAlertEventKind;
  leadName: string;
  leadPhone: string;
  sourceChannel: string;
  captureRef: string;
  createdAt: string;
}

/**
 * Tipos de alerta del sistema. Agregar uno aca obliga a definir su
 * preferencia por defecto y su tono de badge, asi no queda a medias.
 */
export type AlertType = 'new_lead' | 'support_message' | 'chat_reply' | 'upcoming_appointment' | 'overdue_task';

export const ALERT_TYPES: AlertType[] = [
  'new_lead',
  'support_message',
  'chat_reply',
  'upcoming_appointment',
  'overdue_task',
];

export interface AlertTypePreference {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  /** Solo avisar si la extension no esta abierta. */
  onlyWhenClosed: boolean;
}

export interface AlertPreferences {
  byType: Record<AlertType, AlertTypePreference>;
  /** Minutos de anticipacion para el aviso de cita proxima. */
  appointmentLeadMinutes: number;
}

export const ALERT_TYPE_LABELS: Record<AlertType, { title: string; description: string }> = {
  new_lead: {
    title: 'Nuevo lead',
    description: 'Cuando entra un lead a tu cuenta.',
  },
  support_message: {
    title: 'Mensaje de soporte',
    description: 'Cuando alguien te escribe directamente.',
  },
  chat_reply: {
    title: 'Respuesta en el chat',
    description: 'Cuando responden a un mensaje tuyo en una sala.',
  },
  upcoming_appointment: {
    title: 'Cita proxima',
    description: 'Antes de que empiece una cita agendada.',
  },
  overdue_task: {
    title: 'Tarea vencida',
    description: 'Cuando tenes tareas pasadas de fecha.',
  },
};

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  byType: {
    new_lead: { enabled: true, sound: true, desktop: true, onlyWhenClosed: false },
    support_message: { enabled: true, sound: true, desktop: true, onlyWhenClosed: false },
    chat_reply: { enabled: true, sound: false, desktop: true, onlyWhenClosed: true },
    upcoming_appointment: { enabled: true, sound: true, desktop: true, onlyWhenClosed: false },
    overdue_task: { enabled: true, sound: false, desktop: true, onlyWhenClosed: false },
  },
  appointmentLeadMinutes: 15,
};

/**
 * El badge de Chrome no distingue tipos, asi que el color es la unica
 * senal de que clase de alerta llego sin abrir la extension.
 */
export const BADGE_COLORS = {
  critical: '#EF4444',
  newLeads: '#6C4CF6',
  messages: '#3B82F6',
} as const;

export type BadgeTone = keyof typeof BADGE_COLORS;
