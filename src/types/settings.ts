export type ExportFormat = 'json' | 'excel';

export type ComparePeriod = 'yesterday' | 'lastWeek' | 'lastMonth' | 'lastYear';

export type EmailProvider = 'emailjs' | 'resend' | 'gmail';

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

  // Nuevas Metas Diarias
  dailyGoalWhatsApp: number;
  dailyGoalEmail: number;
  dailyGoalCalls: number;
  dashboardComparePeriod: ComparePeriod;
  whatsappClientPreference: 'web' | 'app';

  // Agrupación y Smart Lists
  activeSmartLists?: string[];
  listGroups?: { id: string; name: string; listIds: (number | string)[] }[];
}
