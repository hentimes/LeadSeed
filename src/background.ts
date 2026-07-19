import { hasPendingScheduledEmails, loadBackgroundTaskAlertSummary } from './services/backgroundService';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

async function updateBadge() {
  try {
    const summary = await loadBackgroundTaskAlertSummary();
    if (!summary) return;

    if (summary.total > 0) {
      chrome.action.setBadgeText({ text: String(summary.total) });
      chrome.action.setBadgeBackgroundColor({
        color: summary.overdueCount > 0 ? '#EF4444' : summary.todayCount > 0 ? '#F59E0B' : '#3B82F6',
      });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    chrome.storage.local.set({
      taskAlerts: {
        overdue: summary.overdueCount,
        today: summary.todayCount,
        upcoming: summary.upcomingCount,
        total: summary.total,
      },
    });

    if (summary.overdueCount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { lastOverdueNotify } = await chrome.storage.local.get('lastOverdueNotify');
      if (lastOverdueNotify !== today) {
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
  } catch {
    // DB no disponible aun.
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
