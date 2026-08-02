import { hasPendingScheduledEmails, loadBackgroundTaskAlertSummary } from './services/backgroundService';
import {
  isReconcileAlarm,
  markLeadAlertsAsSeen,
  reconcileLeadAlerts,
  restartLeadAlertsRuntime,
  restoreLeadAlertBadge,
  startLeadAlertsRuntime,
} from './services/backgroundLeadAlertsService';
import {
  restartMessageAlertsRuntime,
  startMessageAlertsRuntime,
} from './services/backgroundMessageAlertsService';
import { checkUpcomingAppointments } from './services/backgroundAgendaAlertsService';
import { dispatchAlert } from './services/alertNotifier';
import { clearBadge, setBadgeCount } from './services/extensionBadgeTheme';

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
 * Abre el panel lateral desde una notificacion nativa.
 *
 * sidePanel.open() exige un gesto del usuario; el click en la notificacion
 * cuenta como tal. Necesita una ventana concreta, y desde el service worker
 * no hay pestaña de contexto, asi que se usa la ultima con foco.
 */
async function openSidePanelFromNotification() {
  try {
    const window = await chrome.windows.getLastFocused();
    if (window?.id === undefined) return;
    await chrome.sidePanel.open({ windowId: window.id });
  } catch (error) {
    // Si Chrome rechaza la apertura no hay forma de recuperarlo desde aca,
    // pero no se puede dejar pasar en silencio: es la unica pista de que el
    // click no hizo nada.
    console.error('No se pudo abrir el panel desde la notificacion:', error);
  }
}

// Cualquier notificacion de la extension abre el panel: todas invitan a
// hacerlo. Antes solo se manejaban las de leads, y ademas se limitaban a
// marcarlas como vistas, asi que el click no abria nada.
chrome.notifications.onClicked.addListener((notificationId) => {
  void openSidePanelFromNotification();

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
