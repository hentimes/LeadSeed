import {
  fetchAuthenticatedUserId,
  fetchProfileSettingsRow,
  updateProfileSettingsRow,
} from '../repositories/settingsRepository';
import type { AppSettings } from '../types';

export const db = {} as any; // Mock para evitar que rompan imports perdidos temporalmente

// Inicializar settings por defecto
export async function getSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    emailProvider: 'emailjs',
    resendApiKey: '',
    resendFromName: 'Acme',
    resendFromEmail: 'onboarding@resend.dev',
    emailJSUserId: '',
    emailJSServiceId: '',
    emailJSTemplateId: '',
    exportFormat: 'json',
    compactMode: true,
    darkMode: false,
    visibleCols: [],
    dailyGoalWhatsApp: 30,
    dailyGoalEmail: 20,
    dailyGoalCalls: 5,
    dashboardComparePeriod: 'yesterday',
  };

  try {
    const userId = await fetchAuthenticatedUserId();
    if (!userId) {
      return defaultSettings;
    }

    const data = await fetchProfileSettingsRow(userId);

    if (data) {
      return {
        ...defaultSettings,
        compactMode: data.compact_mode ?? defaultSettings.compactMode,
        darkMode: data.dark_mode ?? defaultSettings.darkMode,
        visibleCols: data.visible_cols ?? defaultSettings.visibleCols,
        emailProvider: data.email_provider ?? defaultSettings.emailProvider,
        resendApiKey: data.resend_api_key ?? defaultSettings.resendApiKey,
        resendFromName: data.resend_from_name ?? defaultSettings.resendFromName,
        resendFromEmail: data.resend_from_email ?? defaultSettings.resendFromEmail,
        exportFormat: data.export_format ?? defaultSettings.exportFormat,
        dailyGoalWhatsApp: data.daily_goal_whatsapp ?? defaultSettings.dailyGoalWhatsApp,
        dailyGoalEmail: data.daily_goal_email ?? defaultSettings.dailyGoalEmail,
        dailyGoalCalls: data.daily_goal_calls ?? defaultSettings.dailyGoalCalls,
        dashboardComparePeriod: data.dashboard_compare_period ?? defaultSettings.dashboardComparePeriod,
      };
    }
  } catch (e) {
    console.error("Error fetching remote settings:", e);
  }

  return defaultSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const userId = await fetchAuthenticatedUserId();
    if (userId) {
      await updateProfileSettingsRow(userId, {
        compact_mode: settings.compactMode,
        dark_mode: settings.darkMode,
        visible_cols: settings.visibleCols,
        email_provider: settings.emailProvider,
        resend_api_key: settings.resendApiKey,
        resend_from_name: settings.resendFromName,
        resend_from_email: settings.resendFromEmail,
        export_format: settings.exportFormat,
        daily_goal_whatsapp: settings.dailyGoalWhatsApp,
        daily_goal_email: settings.dailyGoalEmail,
        daily_goal_calls: settings.dailyGoalCalls,
        dashboard_compare_period: settings.dashboardComparePeriod,
      });
    }
  } catch (e) {
    console.error("Error saving remote settings:", e);
  }
}
