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

export type ExtensionBadgeMode = 'new_leads' | 'tasks' | 'none';

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
