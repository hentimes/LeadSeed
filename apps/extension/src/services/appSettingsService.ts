import {
  fetchAuthenticatedUserId,
  fetchProfileSettingsRow,
  updateProfileSettingsRow,
} from '../repositories/settingsRepository';
import type { AppSettings, ComparePeriod } from '../types';
import { DEFAULT_LEAD_COLUMNS } from '../config/leadColumns';
import { describeError } from '../utils/errorMessage';


// Inicializar settings por defecto
/**
 * Traduce el periodo guardado al vocabulario nuevo.
 *
 * Hasta la migracion 177 el ajuste decia CONTRA QUE comparar ('yesterday',
 * 'lastWeek'...), y ahora dice QUE VENTANA mostrar ('today', 'last7'...). Los
 * perfiles que ya existen tienen guardado el valor viejo, y sin esto la
 * pantalla arrancaria con un valor que el selector no reconoce: se veria
 * vacio y el panel pediria un periodo que el RPC no entiende.
 *
 * Cada valor viejo va a la ventana de su mismo tamaño, que es lo mas parecido
 * a lo que la persona habia elegido.
 */
const PERIODOS_VIEJOS: Record<string, ComparePeriod> = {
  yesterday: 'today',
  lastWeek: 'last7',
  lastMonth: 'last30',
  lastQuarter: 'last90',
  lastHalf: 'last180',
  lastYear: 'last365',
};

const PERIODOS_VALIDOS: ComparePeriod[] = ['today', 'last7', 'last30', 'last90', 'last180', 'last365'];

export function periodoGuardado(valor: string | null | undefined): ComparePeriod {
  if (!valor) return 'today';
  if (PERIODOS_VALIDOS.includes(valor as ComparePeriod)) return valor as ComparePeriod;
  return PERIODOS_VIEJOS[valor] ?? 'today';
}

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
    visibleCols: DEFAULT_LEAD_COLUMNS,
    whatsappDailyLimit: 50,
    dailyGoalWhatsApp: 50,
    dailyGoalEmail: 20,
    dailyGoalCalls: 10,
    dashboardComparePeriod: 'today',
    whatsappClientPreference: 'web',
    hideUnnamedLeads: false,
    dailySendTaskEnabled: true,
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
        whatsappDailyLimit: data.whatsapp_daily_limit ?? defaultSettings.whatsappDailyLimit,
        dailyGoalWhatsApp: data.daily_goal_whatsapp ?? defaultSettings.dailyGoalWhatsApp,
        dailyGoalEmail: data.daily_goal_email ?? defaultSettings.dailyGoalEmail,
        dailyGoalCalls: data.daily_goal_calls ?? defaultSettings.dailyGoalCalls,
        dashboardComparePeriod: periodoGuardado(data.dashboard_compare_period),
        whatsappClientPreference: data.whatsapp_client_preference ?? defaultSettings.whatsappClientPreference,
        hideUnnamedLeads: data.hide_unnamed_leads ?? defaultSettings.hideUnnamedLeads,
        dailySendTaskEnabled: data.daily_send_task_enabled ?? defaultSettings.dailySendTaskEnabled,
        activeSmartLists: data.active_smart_lists ?? defaultSettings.activeSmartLists,
        listGroups: data.list_groups ?? defaultSettings.listGroups,
      };
    }
  } catch (e) {
    console.error("Error fetching remote settings:", describeError(e));
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
        whatsapp_daily_limit: settings.whatsappDailyLimit,
        daily_goal_whatsapp: settings.dailyGoalWhatsApp,
        daily_goal_email: settings.dailyGoalEmail,
        daily_goal_calls: settings.dailyGoalCalls,
        dashboard_compare_period: settings.dashboardComparePeriod,
        whatsapp_client_preference: settings.whatsappClientPreference,
        hide_unnamed_leads: settings.hideUnnamedLeads,
        daily_send_task_enabled: settings.dailySendTaskEnabled,
        active_smart_lists: settings.activeSmartLists,
        list_groups: settings.listGroups,
      });
    }
  } catch (e) {
    console.error("Error saving remote settings:", describeError(e));
  }
}

/**
 * Cola de escrituras de ajustes.
 *
 * `getSettings` es una consulta de red, no una lectura local, asi que el
 * patron `leer -> mezclar -> escribir` que usan los ajustes **no es atomico**.
 * Con un solo boton de guardar eso no se notaba: habia una escritura por
 * pantalla. Al pasar cada control a guardarse solo, en la pestana General hay
 * cinco que escriben por su cuenta, y tabular de "WhatsApp/dia" a "Emails/dia"
 * basta para solaparlas: las dos leen el mismo estado anterior y la segunda
 * pisa el numero que acababa de guardar la primera.
 *
 * Encadenar las escrituras en una sola promesa hace que cada una lea lo que
 * dejo la anterior. No arregla dos pestanas del navegador escribiendo a la
 * vez -eso pide un patch en el servidor-, pero si el caso real, que es un
 * usuario tabulando entre campos vecinos.
 */
let colaDeAjustes: Promise<unknown> = Promise.resolve();

export function patchSettings(patch: Partial<AppSettings>): Promise<void> {
  const siguiente = colaDeAjustes.then(async () => {
    const actuales = await getSettings();
    await saveSettings({ ...actuales, ...patch });
  });

  // La cola no se rompe si una escritura falla: la siguiente debe intentarlo
  // igual, en vez de quedarse esperando a una promesa ya rechazada.
  colaDeAjustes = siguiente.catch(() => undefined);
  return siguiente;
}
