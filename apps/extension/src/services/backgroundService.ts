import { getCurrentSession } from './authService';
import { fetchDueScheduledEmailLogs, fetchPendingTaskAlertRows } from '../repositories/appMaintenanceRepository';
import { countUnreadNewLeads } from '../repositories/leadsRepository';

export interface BackgroundTaskAlertSummary {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  total: number;
  overdueTitles: string[];
  newLeadsCount: number;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchNewLeadsCount(userId: string): Promise<number> {
  return countUnreadNewLeads(userId);
}

export async function loadBackgroundTaskAlertSummary(): Promise<BackgroundTaskAlertSummary | null> {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return null;
  }

  const tasks = await fetchPendingTaskAlertRows(session.user.id);
  const newLeadsCount = await fetchNewLeadsCount(session.user.id);
  const now = new Date();
  const today = toIsoDay(now);
  const tomorrow = toIsoDay(new Date(now.getTime() + 86400000));

  const overdue = tasks.filter((task) => task.due_date && task.due_date.slice(0, 10) < today);
  const todayTasks = tasks.filter((task) => task.due_date && task.due_date.slice(0, 10) === today);
  const upcoming = tasks.filter((task) => task.due_date && task.due_date.slice(0, 10) === tomorrow);

  return {
    overdueCount: overdue.length,
    todayCount: todayTasks.length,
    upcomingCount: upcoming.length,
    total: overdue.length + todayTasks.length + upcoming.length,
    overdueTitles: overdue.map((task) => task.title),
    newLeadsCount,
  };
}

export async function hasPendingScheduledEmails(): Promise<boolean> {
  const dueLogs = await fetchDueScheduledEmailLogs(new Date().toISOString());
  return dueLogs.length > 0;
}
