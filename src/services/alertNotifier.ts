import {
  DEFAULT_ALERT_PREFERENCES,
  type AlertPreferences,
  type AlertType,
  type AlertTypePreference,
} from '../types';
import { playAlertSound } from './offscreenAudio';

const PREFS_KEY = 'alertPreferences';

export async function getAlertPreferences(): Promise<AlertPreferences> {
  const stored = await chrome.storage.local.get(PREFS_KEY);
  const saved = stored[PREFS_KEY] as Partial<AlertPreferences> | undefined;

  // Merge por tipo: si se agrega un AlertType nuevo, el usuario hereda su
  // default en vez de quedar con la preferencia indefinida.
  return {
    appointmentLeadMinutes: saved?.appointmentLeadMinutes ?? DEFAULT_ALERT_PREFERENCES.appointmentLeadMinutes,
    byType: { ...DEFAULT_ALERT_PREFERENCES.byType, ...(saved?.byType || {}) },
  };
}

export async function setAlertTypePreference(
  type: AlertType,
  patch: Partial<AlertTypePreference>,
): Promise<AlertPreferences> {
  const current = await getAlertPreferences();
  const next: AlertPreferences = {
    ...current,
    byType: { ...current.byType, [type]: { ...current.byType[type], ...patch } },
  };
  await chrome.storage.local.set({ [PREFS_KEY]: next });
  return next;
}

export async function setAppointmentLeadMinutes(minutes: number): Promise<AlertPreferences> {
  const current = await getAlertPreferences();
  const safeMinutes = Math.max(1, Math.min(240, Math.round(minutes)));
  const next: AlertPreferences = { ...current, appointmentLeadMinutes: safeMinutes };
  await chrome.storage.local.set({ [PREFS_KEY]: next });
  return next;
}

/** Detecta si la UI de la extension esta abierta (side panel montado). */
export async function isExtensionUiOpen(): Promise<boolean> {
  if (!chrome.runtime.getContexts) return false;
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['SIDE_PANEL' as chrome.runtime.ContextType, 'TAB' as chrome.runtime.ContextType],
    });
    return contexts.length > 0;
  } catch {
    return false;
  }
}

export interface AlertPayload {
  /** Id estable; se usa como id de notificacion para poder cerrarla. */
  id: string;
  title: string;
  message: string;
}

export interface DispatchResult {
  delivered: boolean;
  uiWasOpen: boolean;
}

/**
 * Punto unico de emision de alertas.
 *
 * Centraliza la decision de avisar para que cada fuente no reimplemente
 * las reglas de preferencias. Devuelve si se entrego, asi el llamador
 * puede decidir si actualiza contadores.
 */
export async function dispatchAlert(type: AlertType, payload: AlertPayload): Promise<DispatchResult> {
  const prefs = await getAlertPreferences();
  const pref = prefs.byType[type];
  const uiWasOpen = await isExtensionUiOpen();

  if (!pref?.enabled) return { delivered: false, uiWasOpen };
  if (pref.onlyWhenClosed && uiWasOpen) return { delivered: false, uiWasOpen };

  if (pref.desktop) {
    chrome.notifications.create(payload.id, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: payload.title,
      message: payload.message,
      priority: 2,
    });
  }

  if (pref.sound) {
    void playAlertSound();
  }

  return { delivered: true, uiWasOpen };
}
