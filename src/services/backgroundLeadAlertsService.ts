import {
  fetchLatestLeadAlertEvent,
  fetchLeadAlertEventsSince,
  subscribeToLeadAlertEvents,
} from '../repositories/leadAlertsRepository';
import { getCurrentSession } from './authService';
import { setBadge } from './extensionBadgeTheme';
import { playAlertSound } from './offscreenAudio';
import type { LeadAlertEvent } from '../types';

const STORAGE_KEY = 'leadAlerts';
const SEEN_IDS_LIMIT = 200;
const RECONCILE_ALARM = 'lead-alerts-reconcile';
const RECONCILE_MINUTES = 0.5; // 30s: minimo que MV3 garantiza para chrome.alarms

export interface LeadAlertsState {
  lastEventCreatedAt: string;
  seenEventIds: string[];
  unseenCount: number;
  desktopEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_STATE: LeadAlertsState = {
  lastEventCreatedAt: '',
  seenEventIds: [],
  unseenCount: 0,
  desktopEnabled: true,
  soundEnabled: true,
};

export async function getLeadAlertsState(): Promise<LeadAlertsState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_STATE, ...(stored[STORAGE_KEY] || {}) };
}

async function saveLeadAlertsState(patch: Partial<LeadAlertsState>): Promise<LeadAlertsState> {
  const current = await getLeadAlertsState();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function setLeadAlertPreferences(prefs: {
  desktopEnabled?: boolean;
  soundEnabled?: boolean;
}): Promise<void> {
  await saveLeadAlertsState(prefs);
}

function notifyDesktop(event: LeadAlertEvent): void {
  chrome.notifications.create(`lead-alert-${event.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Nuevo lead',
    message: event.leadPhone ? `${event.leadName} - ${event.leadPhone}` : event.leadName,
    priority: 2,
  });
}

/**
 * Procesa eventos nuevos y dispara las senales. Es el unico punto que
 * escribe el badge de leads, y deduplica por id para que Realtime y la
 * reconciliacion no avisen dos veces del mismo lead.
 */
async function processIncomingEvents(events: LeadAlertEvent[]): Promise<void> {
  if (events.length === 0) return;

  const state = await getLeadAlertsState();
  const seen = new Set(state.seenEventIds);
  const fresh = events.filter((event) => !seen.has(event.id));

  if (fresh.length === 0) return;

  for (const event of fresh) {
    seen.add(event.id);
    if (state.desktopEnabled) notifyDesktop(event);
  }

  if (state.soundEnabled) {
    // Un solo sonido aunque lleguen varios juntos.
    void playAlertSound();
  }

  const latestCreatedAt = fresh
    .map((event) => event.createdAt)
    .reduce((max, current) => (current > max ? current : max), state.lastEventCreatedAt);

  const unseenCount = state.unseenCount + fresh.length;

  await saveLeadAlertsState({
    lastEventCreatedAt: latestCreatedAt,
    seenEventIds: Array.from(seen).slice(-SEEN_IDS_LIMIT),
    unseenCount,
  });

  setBadge(unseenCount, 'newLeads');

  // La UI abierta escucha esto para mostrar el toast y refrescar la lista.
  chrome.runtime.sendMessage({ type: 'LEAD_ALERTS_INCOMING', events: fresh }).catch(() => {
    // Nadie escuchando: la extension esta cerrada, es esperable.
  });
}

/** Se llama cuando el usuario abre la extension: el badge deja de tener sentido. */
export async function markLeadAlertsAsSeen(): Promise<void> {
  await saveLeadAlertsState({ unseenCount: 0 });
  setBadge(0, 'newLeads');
}

/**
 * Recupera eventos que Realtime no entrego mientras el worker dormia.
 * Es red de seguridad, no el mecanismo primario.
 */
export async function reconcileLeadAlerts(): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user?.id) return;

  const state = await getLeadAlertsState();

  if (!state.lastEventCreatedAt) {
    // Primera vez: fijamos la marca sin avisar de leads viejos.
    const latest = await fetchLatestLeadAlertEvent();
    await saveLeadAlertsState({ lastEventCreatedAt: latest?.createdAt || new Date().toISOString() });
    return;
  }

  try {
    const events = await fetchLeadAlertEventsSince(state.lastEventCreatedAt);
    await processIncomingEvents(events);
  } catch (error) {
    console.warn('[LeadAlerts] Falló la reconciliación:', error);
  }
}

let unsubscribeRealtime: (() => void) | null = null;

export async function startLeadAlertsRuntime(): Promise<void> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!userId) return;

  stopLeadAlertsRuntime();

  unsubscribeRealtime = subscribeToLeadAlertEvents(userId, (event) => {
    void processIncomingEvents([event]);
  });

  await chrome.alarms.clear(RECONCILE_ALARM);
  await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: RECONCILE_MINUTES });

  await reconcileLeadAlerts();
}

export function stopLeadAlertsRuntime(): void {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
}

export function isReconcileAlarm(alarmName: string): boolean {
  return alarmName === RECONCILE_ALARM;
}

export async function restoreLeadAlertBadge(): Promise<void> {
  const state = await getLeadAlertsState();
  setBadge(state.unseenCount, 'newLeads');
}
