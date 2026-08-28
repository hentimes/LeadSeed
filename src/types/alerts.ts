import { BRAND, STATE } from '../design/colors';

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
export type AlertType =
  | 'new_lead'
  | 'support_message'
  | 'chat_reply'
  | 'chat_mention'
  | 'chat_announcement'
  | 'upcoming_appointment'
  | 'overdue_task';

export const ALERT_TYPES: AlertType[] = [
  'new_lead',
  'support_message',
  'chat_reply',
  'chat_mention',
  'chat_announcement',
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

/**
 * Las alertas, repartidas en dos familias.
 *
 * Siete filas de dos lineas son 420px: mas de una pantalla de panel lateral
 * gastada en algo que se configura una vez y no se vuelve a mirar. Plegadas
 * por familia, el reposo baja a ~100px y la cabecera de cada una dice cuantas
 * tiene encendidas, que es el dato por el que se entra.
 *
 * Son dos y no tres a proposito: con "Agenda" aparte, esa familia tendria un
 * solo elemento, y una seccion plegable de un item es ruido.
 *
 * Vive junto a `ALERT_TYPE_LABELS` para que anadir una alerta obligue a
 * decidir su familia en el mismo archivo, en vez de dejarla fuera de las dos
 * y que no se pinte en ningun sitio.
 */
export interface AlertFamily {
  id: string;
  title: string;
  types: AlertType[];
}

export const ALERT_FAMILIES: AlertFamily[] = [
  {
    id: 'trabajo',
    title: 'Tu trabajo',
    types: ['new_lead', 'overdue_task', 'upcoming_appointment'],
  },
  {
    id: 'conversaciones',
    title: 'Conversaciones',
    types: ['chat_reply', 'chat_mention', 'chat_announcement', 'support_message'],
  },
];

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
  chat_mention: {
    title: 'Te mencionaron',
    description: 'Cuando alguien te nombra con @ en una sala.',
  },
  chat_announcement: {
    title: 'Anuncio del equipo',
    description: 'Cuando un admin o helper envía un mensaje para todos.',
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
    // Una mencion directa avisa siempre, tambien con la extension abierta:
    // es el caso en que alguien espera una respuesta tuya.
    chat_mention: { enabled: true, sound: true, desktop: true, onlyWhenClosed: false },
    chat_announcement: { enabled: true, sound: true, desktop: true, onlyWhenClosed: false },
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
  critical: STATE.danger,
  newLeads: BRAND.primary,
  messages: STATE.info,
} as const;

export type BadgeTone = keyof typeof BADGE_COLORS;
