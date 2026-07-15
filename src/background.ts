
import { supabase } from './lib/supabaseClient';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

async function updateBadge() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pendiente')
      .eq('user_id', sessionData.session.user.id);
      
    if (!tasks) return;
    
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    const overdue = tasks.filter((t: any) => t.due_date && t.due_date.slice(0, 10) < today);
    const todayTasks = tasks.filter((t: any) => t.due_date && t.due_date.slice(0, 10) === today);
    const upcoming = tasks.filter((t: any) => t.due_date && t.due_date.slice(0, 10) === tomorrow);
    const total = overdue.length + todayTasks.length + upcoming.length;

    if (total > 0) {
      chrome.action.setBadgeText({ text: String(total) });
      chrome.action.setBadgeBackgroundColor({ color: overdue.length > 0 ? '#EF4444' : todayTasks.length > 0 ? '#F59E0B' : '#3B82F6' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    chrome.storage.local.set({ taskAlerts: { overdue: overdue.length, today: todayTasks.length, upcoming: upcoming.length, total } });

    // Notificar solo una vez al día por vencidas
    if (overdue.length > 0) {
      const { lastOverdueNotify } = await chrome.storage.local.get('lastOverdueNotify');
      if (lastOverdueNotify !== today) {
        chrome.notifications.create('tasks-overdue', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'LeadSeed - Tareas vencidas',
          message: `${overdue.length} tarea(s) vencida(s): ${overdue.map((t: any) => t.title).join(', ').slice(0, 100)}`,
          priority: 2,
        });
        chrome.storage.local.set({ lastOverdueNotify: today });
      }
    }
  } catch { /* DB no disponible aún */ }
}

// Siempre crear alarma y actualizar badge
chrome.alarms.clear('check-tasks', () => {
  chrome.alarms.create('check-tasks', { periodInMinutes: 5 });
});
updateBadge();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-tasks') {
    await updateBadge();
    // Revisar emails programados
    try {
      const now = new Date().toISOString();
      const { data: logsData } = await supabase.from('send_logs').select('*').eq('template_type', 'email');
      const due = (logsData || []).filter((l) => l.scheduled_for && l.scheduled_for <= now);
      if (due.length > 0) {
        chrome.storage.local.set({ hasScheduledEmails: true });
      }
    } catch { /* noop */ }
  }
});
