import {
  fetchLatestLeadAlertEvent,
  fetchLeadAlertEventsSince,
  subscribeToLeadAlertEvents,
} from '../repositories/leadAlertsRepository';
import { getCurrentSession } from '../services/authService';
import { restoreBadge, setBadgeCount } from './extensionBadgeTheme';
import { dispatchAlert } from './alertNotifier';
import type { LeadAlertEvent } from '../types';

const STORAGE_KEY = 'leadAlerts';
const SEEN_IDS_LIMIT = 200;
const RECONCILE_ALARM = 'lead-alerts-reconcile';
const RECONCILE_MINUTES = 0.5; // 30s: minimo que MV3 garantiza para chrome.alarms

export interface LeadAlertsState {
  lastEventCreatedAt: string;
  seenEventIds: string[];
  unseenCount: number;
}

const DEFAULT_STATE: LeadAlertsState = {
  lastEventCreatedAt: '',
  seenEventIds: [],
  unseenCount: 0,
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

/**
 * Cola de serializacion.
 *
 * Realtime y la reconciliacion pueden entregar el mismo evento casi a la
 * vez. Sin esto, ambas leerian el estado antes de que la otra escriba,
 * verian el evento como no visto y notificarian dos veces, ademas de
 * pisarse el contador. La dedup por id no alcanza: depende de un
 * seenEventIds que las dos leyeron desactualizado.
 */
let processingQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  processingQueue = processingQueue.then(task, task);
  return processingQueue;
}

/**
 * Procesa eventos nuevos y dispara las senales. Es el unico punto que
 * escribe el badge de leads, y deduplica por id para que Realtime y la
 * reconciliacion no avisen dos veces del mismo lead.
 */
function processIncomingEvents(events: LeadAlertEvent[]): Promise<void> {
  if (events.length === 0) return Promise.resolve();
  return enqueue(() => processIncomingEventsUnsafe(events));
}

async function processIncomingEventsUnsafe(events: LeadAlertEvent[]): Promise<void> {
  const state = await getLeadAlertsState();
  const seen = new Set(state.seenEventIds);
  const fresh = events.filter((event) => !seen.has(event.id));

  if (fresh.length === 0) return;

  for (const event of fresh) {
    seen.add(event.id);
    await dispatchAlert('new_lead', {
      id: `lead-alert-${event.id}`,
      title: 'Nuevo lead',
      message: event.leadPhone ? `${event.leadName} - ${event.leadPhone}` : event.leadName,
    });
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

  void setBadgeCount('newLeads', unseenCount);

  // La UI abierta escucha esto para mostrar el toast y refrescar la lista.
  chrome.runtime.sendMessage({ type: 'LEAD_ALERTS_INCOMING', events: fresh }).catch(() => {
    // Nadie escuchando: la extension esta cerrada, es esperable.
  });
}

/** Se llama cuando el usuario abre la extension: el badge deja de tener sentido. */
export async function markLeadAlertsAsSeen(): Promise<void> {
  await saveLeadAlertsState({ unseenCount: 0 });
  void setBadgeCount('newLeads', 0);
}

/**
 * Recupera eventos que Realtime no entrego mientras el worker dormia.
 * Es red de seguridad, no el mecanismo primario.
 */
let lastReconcileAt = 0;
const RECONCILE_DEBOUNCE_MS = 5000;

export async function reconcileLeadAlerts(): Promise<void> {
  // En un despertar en frio, el arranque del runtime y el listener de
  // alarma piden reconciliar casi a la vez; una sola consulta alcanza.
  const now = Date.now();
  if (now - lastReconcileAt < RECONCILE_DEBOUNCE_MS) return;
  lastReconcileAt = now;

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
let startPromise: Promise<void> | null = null;

async function startRuntimeOnce(): Promise<void> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!userId) {
    // Sin sesion no hay a que suscribirse; se permite reintentar mas tarde.
    startPromise = null;
    return;
  }

  stopLeadAlertsRuntime();

  unsubscribeRealtime = subscribeToLeadAlertEvents(userId, (event) => {
    void processIncomingEvents([event]);
  });

  await chrome.alarms.clear(RECONCILE_ALARM);
  await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: RECONCILE_MINUTES });
}

/**
 * Punto de entrada unico del runtime.
 *
 * Al despertar en frio, MV3 re-evalua el script Y dispara el listener de
 * alarma. Sin este guard, ambos caminos suscribirian su propio canal
 * Realtime y quedaria uno colgado.
 */
export function startLeadAlertsRuntime(): Promise<void> {
  if (!startPromise) {
    startPromise = startRuntimeOnce().catch((error) => {
      console.warn('[LeadAlerts] No se pudo iniciar el runtime:', error);
      startPromise = null;
    });
  }
  return startPromise;
}

/** Fuerza un re-arranque; se usa cuando cambia la sesion. */
export async function restartLeadAlertsRuntime(): Promise<void> {
  startPromise = null;
  stopLeadAlertsRuntime();
  await startLeadAlertsRuntime();
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
  // Se refresca el contador de leads con lo persistido y despues se repinta el
  // badge completo, para no borrar lo que hayan dejado mensajes o criticos.
  await setBadgeCount('newLeads', state.unseenCount);
  await restoreBadge();
}
