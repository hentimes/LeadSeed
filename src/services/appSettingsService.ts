import {
  fetchAuthenticatedUserId,
  fetchProfileSettingsRow,
  updateProfileSettingsRow,
} from '../repositories/settingsRepository';
import type { AppSettings } from '../types';

// Inicializar settings por defecto
export async function getSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    emailProvider: 'gmail',
    resendFromName: '',
    resendFromEmail: '',
    emailJSUserId: '',
    emailJSServiceId: '',
    emailJSTemplateId: '',
    exportFormat: 'excel',
    compactMode: false,
    darkMode: false,
    visibleCols: [
      { key: 'name', label: 'Nombre', visible: true },
      { key: 'phone', label: 'Teléfono', visible: true },
      { key: 'email', label: 'Correo', visible: true },
      { key: 'status', label: 'Estado', visible: true },
    ],
    dailyGoalWhatsApp: 50,
    dailyGoalEmail: 20,
    dailyGoalCalls: 10,
    dashboardComparePeriod: 'lastWeek',
    whatsappClientPreference: 'web',
    activeSmartLists: ['smart_nuevos', 'smart_sin_gestion', 'smart_eliminados'],
    listGroups: [],
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
        resendFromName: data.resend_from_name ?? defaultSettings.resendFromName,
        resendFromEmail: data.resend_from_email ?? defaultSettings.resendFromEmail,
        exportFormat: data.export_format ?? defaultSettings.exportFormat,
        dailyGoalWhatsApp: data.daily_goal_whatsapp ?? defaultSettings.dailyGoalWhatsApp,
        dailyGoalEmail: data.daily_goal_email ?? defaultSettings.dailyGoalEmail,
        dailyGoalCalls: data.daily_goal_calls ?? defaultSettings.dailyGoalCalls,
        dashboardComparePeriod: data.dashboard_compare_period ?? defaultSettings.dashboardComparePeriod,
        whatsappClientPreference: data.whatsapp_client_preference ?? defaultSettings.whatsappClientPreference,
        activeSmartLists: data.active_smart_lists ?? defaultSettings.activeSmartLists,
        listGroups: data.list_groups ?? defaultSettings.listGroups,
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
        resend_from_name: settings.resendFromName,
        resend_from_email: settings.resendFromEmail,
        export_format: settings.exportFormat,
        daily_goal_whatsapp: settings.dailyGoalWhatsApp,
        daily_goal_email: settings.dailyGoalEmail,
        daily_goal_calls: settings.dailyGoalCalls,
        dashboard_compare_period: settings.dashboardComparePeriod,
        whatsapp_client_preference: settings.whatsappClientPreference,
        active_smart_lists: settings.activeSmartLists,
        list_groups: settings.listGroups,
      });
    }
  } catch (e) {
    console.error("Error saving remote settings:", e);
  }
}
