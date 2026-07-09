import { db } from '../db/database';

export async function checkTaskNotifications(): Promise<void> {
  const tasks = await db.tasks.where('status').equals('pendiente').toArray();
  const today = new Date().toISOString().slice(0, 10);

  const overdue = tasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < today);
  const todayTasks = tasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === today);

  if (overdue.length > 0) {
    chrome.notifications.create('tasks-overdue', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Tareas vencidas',
      message: `${overdue.length} tarea(s) pendiente(s): ${overdue.map((t) => t.titulo).join(', ')}`,
      priority: 2,
    });
  }

  if (todayTasks.length > 0) {
    chrome.notifications.create('tasks-today', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Tareas para hoy',
      message: `${todayTasks.length} tarea(s): ${todayTasks.map((t) => t.titulo).join(', ')}`,
      priority: 1,
    });
  }
}
