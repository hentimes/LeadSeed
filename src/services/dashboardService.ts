import { fetchRecentSendLogsForUser } from './historyService';
import { fetchTasksForUser } from './tasksService';
import type { SendLog, Task } from '../types';

export interface DashboardOperationalData {
  logs: SendLog[];
  tasks: Task[];
}

export async function fetchDashboardOperationalData(userId: string): Promise<DashboardOperationalData> {
  const [logs, tasks] = await Promise.all([
    fetchRecentSendLogsForUser(userId),
    fetchTasksForUser(userId),
  ]);

  return { logs, tasks };
}
