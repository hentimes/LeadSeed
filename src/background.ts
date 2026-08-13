import { hasPendingScheduledEmails, loadBackgroundTaskAlertSummary } from './services/backgroundService';
import {
  isReconcileAlarm,
  markLeadAlertsAsSeen,
  reconcileLeadAlerts,
  restartLeadAlertsRuntime,
  restoreLeadAlertBadge,
  startLeadAlertsRuntime,
} from './platform/backgroundLeadAlerts';
import {
  restartMessageAlertsRuntime,
  startMessageAlertsRuntime,
} from './services/backgroundMessageAlertsService';
import { checkUpcomingAppointments } from './platform/backgroundAgendaAlerts';
import { dispatchAlert } from './platform/alertNotifier';
import { clearBadge, setBadgeCount } from './platform/extensionBadgeTheme';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

/**
 * Ciclo de tareas. El badge de leads NO se toca aca: lo maneja
 * backgroundLeadAlerts por eventos, no por sondeo.
 */
async function updateTaskAlerts() {
  try {
    const summary = await loadBackgroundTaskAlertSummary();
    if (!summary) return;

    const stored = await chrome.storage.local.get(['lastOverdueNotify']);

    chrome.storage.local.set({
      taskAlerts: {
        overdue: summary.overdueCount,
        today: summary.todayCount,
        upcoming: summary.upcomingCount,
        total: summary.total,
      },
    });

    // Tareas vencidas: una vez al dia, respetando las preferencias.
    if (summary.overdueCount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      if (stored.lastOverdueNotify !== today) {
        const result = await dispatchAlert('overdue_task', {
          id: 'tasks-overdue',
          title: 'Tareas vencidas',
          message: `${summary.overdueCount} tarea(s) vencida(s): ${summary.overdueTitles.join(', ').slice(0, 100)}`,
        });
        // Solo marcar el dia si de verdad se aviso; si estaba desactivada
        // o suprimida por 'solo con extension cerrada', se reintenta luego.
        if (result.delivered) {
          chrome.storage.local.set({ lastOverdueNotify: today });
          // Tono critico. Es un contador fijo, no acumulativo: el aviso sale
          // una vez por dia y refleja cuantas tareas hay vencidas ahora.
          await setBadgeCount('critical', summary.overdueCount);
        }
      }
    }
  } catch (error) {
    console.error('[Background] Error en updateTaskAlerts:', error);
  }
}

chrome.alarms.clear('check-tasks', () => {
  chrome.alarms.create('check-tasks', { periodInMinutes: 5 });
});

async function bootAlerts() {
  await restoreLeadAlertBadge();
  await startLeadAlertsRuntime();
  await startMessageAlertsRuntime();
  await reconcileLeadAlerts();
  await checkUpcomingAppointments();
}

void updateTaskAlerts();
void bootAlerts();

chrome.runtime.onStartup.addListener(() => {
  void bootAlerts();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (isReconcileAlarm(alarm.name)) {
    // Si el service worker fue terminado, las conexiones Realtime murieron
    // con el. Re-asegurarlas aca evita degradar a sondeo de 30s.
    await startLeadAlertsRuntime();
    await startMessageAlertsRuntime();
    await reconcileLeadAlerts();
    await checkUpcomingAppointments();
    return;
  }

  if (alarm.name === 'check-tasks') {
    await updateTaskAlerts();
    try {
      chrome.storage.local.set({ hasScheduledEmails: await hasPendingScheduledEmails() });
    } catch {
      // noop
    }
  }
});

/**
 * Abre la extension desde una notificacion nativa.
 *
 * chrome.sidePanel.open() exige "user gesture" y Chrome NO considera el
 * click en una notificacion como tal (probado en produccion: "may only be
 * called in response to a user gesture" incluso llamandolo directo desde
 * el handler de notifications.onClicked). No hay forma de abrir el panel
 * lateral por este camino. Se abre en una pestaña normal en su lugar,
 * igual que ya hace abrirWhatsAppWeb: chrome.tabs.create no tiene esa
 * restriccion de gesto.
 */
async function openAppFromNotification() {
  try {
    const url = chrome.runtime.getURL('index.html');
    const tabs = await chrome.tabs.query({ url: `${url}*` });

    const yaAbierta = tabs[0];
    if (yaAbierta?.id !== undefined) {
      await chrome.tabs.update(yaAbierta.id, { active: true });
      if (yaAbierta.windowId !== undefined) {
        await chrome.windows.update(yaAbierta.windowId, { focused: true });
      }
      return;
    }

    await chrome.tabs.create({ url, active: true });
  } catch (error) {
    console.error('No se pudo abrir la extension desde la notificacion:', error);
  }
}

// Cualquier notificacion de la extension abre la app: todas invitan a
// hacerlo. Antes solo se manejaban las de leads, y ademas se limitaban a
// marcarlas como vistas, asi que el click no abria nada.
chrome.notifications.onClicked.addListener((notificationId) => {
  void openAppFromNotification();

  if (notificationId.startsWith('lead-alert-')) {
    void markLeadAlertsAsSeen();
  }

  chrome.notifications.clear(notificationId);
});

async function abrirWhatsAppWeb(numero: string, mensaje: string) {
  const telefono = String(numero).replace(/\D/g, "");

  if (!telefono) {
    throw new Error("El número de teléfono es inválido.");
  }

  const url = new URL("https://web.whatsapp.com/send");
  url.searchParams.set("phone", telefono);

  if (mensaje) {
    url.searchParams.set("text", mensaje);
  }

  const tabs = await chrome.tabs.query({
    url: ["https://web.whatsapp.com/*"],
  });

  const whatsappTab = tabs[0];
  if (whatsappTab?.id !== undefined) {
    await chrome.tabs.update(whatsappTab.id, {
      url: url.toString(),
      active: true,
    });

    if (whatsappTab.windowId !== undefined) {
      await chrome.windows.update(whatsappTab.windowId, {
        focused: true,
      });
    }

    return {
      action: "reused",
      tabId: whatsappTab.id,
    };
  }

  const newTab = await chrome.tabs.create({
    url: url.toString(),
    active: true,
  });

  return {
    action: "created",
    tabId: newTab.id,
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "LEAD_ALERTS_MARK_SEEN") {
    // Este mensaje lo manda la UI al abrirse. Ademas de los leads hay que
    // apagar mensajes y criticos: ahora tambien suman al badge, y si no se
    // limpian aca quedan pegados aunque el usuario ya haya entrado.
    void markLeadAlertsAsSeen();
    void clearBadge();
    return false;
  }

  if (request.type === "LEAD_ALERTS_RESTART") {
    void restartLeadAlertsRuntime();
    void restartMessageAlertsRuntime();
    return false;
  }

  if (request.type === "OPEN_WHATSAPP_WEB") {
    abrirWhatsAppWeb(request.payload.phone, request.payload.message)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error("Error al abrir WhatsApp Web:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});
