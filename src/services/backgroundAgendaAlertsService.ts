import { getDefaultAgendaRange, listMyAppointments } from './agendaService';
import { getCurrentSession } from './authService';
import { dispatchAlert, getAlertPreferences } from './alertNotifier';

const STORAGE_KEY = 'agendaAlerts';
const NOTIFIED_LIMIT = 50;
const ACTIVE_STATUSES = new Set(['pendiente', 'agendada', 'confirmada', 'tentativa']);

interface AgendaAlertsState {
  notifiedAppointmentIds: string[];
}

async function getState(): Promise<AgendaAlertsState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { notifiedAppointmentIds: [], ...(stored[STORAGE_KEY] || {}) };
}

async function saveState(state: AgendaAlertsState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * A diferencia de leads y mensajes, una cita proxima no es un evento que
 * el backend emita: es el paso del tiempo. Por eso se evalua en cada
 * corrida del alarm en vez de por Realtime.
 */
export async function checkUpcomingAppointments(): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user?.id) return;

  const prefs = await getAlertPreferences();
  if (!prefs.byType.upcoming_appointment.enabled) return;

  try {
    const range = getDefaultAgendaRange(2);
    const appointments = await listMyAppointments(range.from, range.to);

    const now = Date.now();
    const windowMs = prefs.appointmentLeadMinutes * 60_000;
    const state = await getState();
    const notified = new Set(state.notifiedAppointmentIds);

    const due = appointments.filter((appointment) => {
      if (!ACTIVE_STATUSES.has(appointment.status.toLowerCase())) return false;
      if (notified.has(appointment.id)) return false;

      const startsIn = new Date(appointment.startsAt).getTime() - now;
      // Ya pasada no avisa; solo dentro de la ventana de anticipacion.
      return startsIn > 0 && startsIn <= windowMs;
    });

    for (const appointment of due) {
      notified.add(appointment.id);
      const minutes = Math.max(1, Math.round((new Date(appointment.startsAt).getTime() - now) / 60_000));
      await dispatchAlert('upcoming_appointment', {
        id: `appointment-${appointment.id}`,
        title: `Cita en ${minutes} min`,
        message: `${appointment.leadName} - ${formatTime(appointment.startsAt)}`,
      });
    }

    if (due.length > 0) {
      await saveState({ notifiedAppointmentIds: Array.from(notified).slice(-NOTIFIED_LIMIT) });
    }
  } catch (error) {
    console.warn('[AgendaAlerts] No se pudo revisar citas proximas:', error);
  }
}
