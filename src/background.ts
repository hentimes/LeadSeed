import { hasPendingScheduledEmails, loadBackgroundTaskAlertSummary } from './services/backgroundService';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

async function updateBadge() {
  try {
    console.log('[Background] Ejecutando updateBadge...');
    
    const summary = await loadBackgroundTaskAlertSummary();
    
    // NOTIFICACION DE DIAGNOSTICO EN PANTALLA
    if (!summary) {
      console.log('[Background] No hay summary (probablemente sin sesión)');
      return;
    }

    // El badge ahora muestra la cantidad de Nuevos Leads
    if (summary.newLeadsCount > 0) {
      console.log(`[Background] Configurando badge: ${summary.newLeadsCount} leads nuevos`);
      chrome.action.setBadgeText({ text: String(summary.newLeadsCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Rojo para nuevos leads
    } else {
      console.log('[Background] Sin leads nuevos, limpiando badge');
      chrome.action.setBadgeText({ text: '' });
    }

    // Persistir datos para la UI y detectar cambios
    const stored = await chrome.storage.local.get(['taskAlerts', 'lastNewLeadsCount', 'lastOverdueNotify']);
    
    chrome.storage.local.set({
      taskAlerts: {
        overdue: summary.overdueCount,
        today: summary.todayCount,
        upcoming: summary.upcomingCount,
        total: summary.total,
      },
      lastNewLeadsCount: summary.newLeadsCount
    });

    // Notificación de nuevos leads si el conteo aumentó
    const prevLeadsCount = stored.lastNewLeadsCount || 0;
    if (summary.newLeadsCount > prevLeadsCount) {
      console.log('[Background] Disparando notificacion de nuevos leads');
      chrome.notifications.create('new-leads', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '¡Nuevos Leads Recibidos!',
        message: `Tienes ${summary.newLeadsCount} lead(s) en estado Nuevo esperando gestión.`,
        priority: 2,
      });
    }

    // Mantener también la notificación de tareas vencidas (una vez al día)
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
    console.error('[Background] Error en updateBadge:', error);
    chrome.notifications.create('test-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Error de Background',
      message: `Error al cargar: ${error instanceof Error ? error.message : String(error)}`,
      priority: 2,
    });
  }
}

chrome.alarms.clear('check-tasks', () => {
  chrome.alarms.create('check-tasks', { periodInMinutes: 5 });
});
void updateBadge();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-tasks') {
    await updateBadge();
    try {
      chrome.storage.local.set({ hasScheduledEmails: await hasPendingScheduledEmails() });
    } catch {
      // noop
    }
  }
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
