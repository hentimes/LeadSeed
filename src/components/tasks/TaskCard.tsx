import type { Task, Lead, LeadList } from '../../types';
import { Icon } from '../../utils/icons';

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  isToday: boolean;
  tomorrow: string;
  leads: Lead[];
  lists: LeadList[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({
  task,
  isOverdue,
  isToday,
  tomorrow,
  leads,
  lists,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  return (
    <div className={`border rounded-lg p-3 ${task.status === 'completada' ? 'opacity-60 bg-slate-50 dark:bg-slate-900 dark:bg-gray-800/50' : isOverdue ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : isToday ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-900 dark:border-gray-700'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={task.status === 'completada'} onChange={() => onToggleComplete(task)} className="mt-0.5 rounded" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-sm font-medium ${task.status === 'completada' ? 'line-through text-gray-400' : ''}`}>{task.titulo}</h4>
            {isOverdue && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">VENCIDA</span>}
            {isToday && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">HOY</span>}
            {!isOverdue && !isToday && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === tomorrow && (
              <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">MAÑANA</span>
            )}
            {task.status === 'completada' && <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">COMPLETADA</span>}
          </div>
          {task.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-gray-400 mt-1">{task.descripcion}</p>}
          {task.fechaVencimiento && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : isToday ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
              {isOverdue ? 'Venció' : 'Vence'}: {new Date(task.fechaVencimiento).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
          <div className="flex gap-1 mt-1 flex-wrap">
            {task.leadIds?.map((lid) => (
              <span key={lid} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded">{leads.find((l) => l.id === lid)?.name || '?'}</span>
            ))}
            {task.leadListIds?.map((lid) => (
              <span key={lid} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400 dark:text-gray-400 px-1 rounded">{lists.find((l) => l.id === lid)?.name || '?'}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-blue-600 text-xs" title="Editar">{Icon.Edit()}</button>
          <button onClick={() => onDelete(task.id!)} className="text-gray-400 hover:text-red-600 text-xs" title="Eliminar">{Icon.Trash()}</button>
        </div>
      </div>
    </div>
  );
}
