import { hasPendingScheduledEmails, loadBackgroundTaskAlertSummary } from './services/backgroundService';
import {
  isReconcileAlarm,
  markLeadAlertsAsSeen,
  reconcileLeadAlerts,
  restartLeadAlertsRuntime,
  restoreLeadAlertBadge,
  startLeadAlertsRuntime,
} from './services/backgroundLeadAlertsService';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

/**
 * Ciclo de tareas. El badge de leads NO se toca aca: lo maneja
 * backgroundLeadAlertsService por eventos, no por sondeo.
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

    // Notificación de tareas vencidas (una vez al día)
    if (summary.overdueCount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      if (stored.lastOverdueNotify !== today) {
        console.log('[Background] Disparando notificacion de tareas vencidas');
        chrome.notifications.create('tasks-overdue', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'LeadSeed - Tareas vencidas',
          message: `${summary.overdueCount} tarea(s) vencida(s): ${summary.overdueTitles.join(', ').slice(0, 100)}`,
          priority: 2,
        });
        chrome.storage.local.set({ lastOverdueNotify: today });
      }
    }
  } catch (error) {
    console.error('[Background] Error en updateTaskAlerts:', error);
  }
}

chrome.alarms.clear('check-tasks', () => {
  chrome.alarms.create('check-tasks', { periodInMinutes: 5 });
});

async function bootLeadAlerts() {
  await restoreLeadAlertBadge();
  await startLeadAlertsRuntime();
  await reconcileLeadAlerts();
}

void updateTaskAlerts();
void bootLeadAlerts();

chrome.runtime.onStartup.addListener(() => {
  void bootLeadAlerts();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (isReconcileAlarm(alarm.name)) {
    // Si el service worker fue terminado, la conexion Realtime murio con
    // el. Re-asegurarla aca es lo que evita degradar a sondeo de 30s.
    await startLeadAlertsRuntime();
    await reconcileLeadAlerts();
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

// Abrir la extension desde la notificacion nativa.
chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith('lead-alert-')) return;
  void markLeadAlertsAsSeen();
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

  if (tabs.length > 0) {
    const whatsappTab = tabs[0];

    await chrome.tabs.update(whatsappTab.id!, {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "LEAD_ALERTS_MARK_SEEN") {
    void markLeadAlertsAsSeen();
    return false;
  }

  if (request.type === "LEAD_ALERTS_RESTART") {
    void restartLeadAlertsRuntime();
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
