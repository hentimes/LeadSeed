export type ExportFormat = 'json' | 'excel';

/**
 * Que periodo muestra el panel.
 *
 * Antes esto era "contra que se compara", y por eso el selector no hacia casi
 * nada: movia tres campos de comparacion y dejaba el resto de la pantalla
 * -total, conversion, embudo, fuentes- como acumulados de siempre.
 *
 * Ahora es una VENTANA: el panel muestra las cifras de ese periodo y las
 * compara contra el periodo anterior del mismo tamaño. Ver migracion 177.
 */
export type ComparePeriod = 'today' | 'last7' | 'last30' | 'last90' | 'last180' | 'last365';

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
  /**
   * Si cada dia aparece sola una tarea "Enviar mensajes de hoy".
   *
   * Es una idea distinta del tope diario, y por eso es un ajuste aparte: el
   * tope dice cuantos mensajes es prudente mandar, esto dice si quieres que te
   * lo recuerden. Quien manda sin tope puede querer el recordatorio igual.
   */
  dailySendTaskEnabled: boolean;

  // Agrupación y Smart Lists
  activeSmartLists?: string[];
  listGroups?: { id: string; name: string; listIds: (number | string)[] }[];
}
