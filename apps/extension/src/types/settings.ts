export type ExportFormat = 'json' | 'excel';

/**
 * Contra que se compara el panel.
 *
 * Ojo con lo que significa, porque no es obvio: la comparacion es contra el
 * MISMO DIA de hace N dias, no contra el acumulado del periodo. El panel dice
 * cuantos leads entraron hoy y cuantos entraron ese dia.
 *
 * `lastQuarter` y `lastHalf` se añaden en la migracion 175: el mes se queda
 * corto y el año se queda largo para mirar un negocio comercial.
 */
export type ComparePeriod =
  | 'yesterday'
  | 'lastWeek'
  | 'lastMonth'
  | 'lastQuarter'
  | 'lastHalf'
  | 'lastYear';

export type EmailProvider = 'emailjs' | 'resend' | 'gmail';

/** Adjunto de correo, en base64. Vive aca y no en utils para que los
 *  repositorios puedan usarlo sin depender de una capa superior. */
export interface EmailAttachment {
  filename: string;
  content: string;
}

export interface EmailChannelSummary {
  id: string;
  provider: string;
  channelName: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  isDefault: boolean;
  dailyLimit: number;
  credentialsHint: string;
  metadata: Record<string, unknown>;
  lastTestedAt?: string | null;
  lastTestStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDeliveryChannelOption {
  id: string;
  provider: EmailProvider;
  label: string;
  fromName: string;
  fromEmail: string;
  isConnected: boolean;
  isDefault: boolean;
  isActiveProvider: boolean;
  dailyLimit?: number;
}

export interface AppSettings {
  emailProvider: EmailProvider;
  resendFromName: string;
  resendFromEmail: string;
  emailJSUserId: string;
  emailJSServiceId: string;
  emailJSTemplateId: string;
  exportFormat: ExportFormat;
  compactMode: boolean;
  darkMode: boolean;
  visibleCols: { key: string; label: string; visible: boolean }[];

  /**
   * TOPE de WhatsApp por dia, distinto de la META de abajo.
   *
   * La meta motiva -"hoy quiero llegar a 50"- y se puede bajar un dia flojo. El
   * tope frena: pasarse arriesga que WhatsApp bloquee la cuenta. Con un solo
   * numero, bajar la meta apagaria los flujos, que no es lo que nadie quiso.
   */
  whatsappDailyLimit: number;

  // Nuevas Metas Diarias
  dailyGoalWhatsApp: number;
  dailyGoalEmail: number;
  dailyGoalCalls: number;
  dashboardComparePeriod: ComparePeriod;
  whatsappClientPreference: 'web' | 'app';
  /**
   * Ocultar los leads sin nombre. Preferencia de trabajo, no estado de pantalla:
   * se aplica igual en la tabla, el pipeline y el panel de flujos, y sobrevive a
   * cambiar de seccion y a cerrar el panel. Ver migracion 116.
   */
  hideUnnamedLeads: boolean;

  // Agrupación y Smart Lists
  activeSmartLists?: string[];
  listGroups?: { id: string; name: string; listIds: (number | string)[] }[];
}
