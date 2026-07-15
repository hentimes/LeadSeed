import type { Task, Lead, LeadList } from '../../types';
import TaskCard from './TaskCard';

interface TaskSectionProps {
  title: string;
  color: string;
  tasks: Task[];
  leads: Lead[];
  lists: LeadList[];
  tomorrow: string;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskSection({
  title,
  color,
  tasks,
  leads,
  lists,
  tomorrow,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskSectionProps) {
  const colors: Record<string, string> = {
    red: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    amber: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
    blue: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
    gray: 'border-l-gray-400 bg-gray-50/50 dark:bg-gray-800/50',
  };

  return (
    <div>
      <div className={`border-l-4 ${colors[color]} pl-3 py-1 mb-2 rounded-r`}>
        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title} ({tasks.length})</h3>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const today = new Date().toISOString().slice(0, 10);
          const isOverdue = !!(task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) < today);
          const isToday = !!(task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === today);
          return (
            <TaskCard
              key={task.id}
              task={task}
              isOverdue={isOverdue}
              isToday={isToday}
              tomorrow={tomorrow}
              leads={leads}
              lists={lists}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
