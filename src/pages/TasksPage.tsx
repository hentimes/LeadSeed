import { useEffect, useMemo, useState } from 'react';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import TaskSection from '../components/tasks/TaskSection';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import {
  fetchTasksForUser,
  removeTask,
  saveTaskForUser,
  toggleTaskCompletion,
} from '../services/tasksService';
import type { Lead, LeadList, Task, TaskStatus } from '../types';
import { Icon } from '../utils/icons';

const STATUS_TABS: { key: TaskStatus | 'todas'; label: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendientes', color: 'text-amber-600' },
  { key: 'completada', label: 'Completadas', color: 'text-green-600' },
  { key: 'todas', label: 'Todas', color: 'text-slate-500 dark:text-slate-400' },
];

export default function TasksPage({ onTasksChanged }: { onTasksChanged?: () => void }) {
  const { user } = useAuth();
  const { getAll: getLeads } = useLeads();
  const { getAll: getLists } = useLists();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('pendiente');

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [fetchedTasks, fetchedLeads, fetchedLists] = await Promise.all([
      fetchTasksForUser(user.id),
      getLeads(),
      getLists(),
    ]);

    setTasks(fetchedTasks);
    setLeads(fetchedLeads);
    setLists(fetchedLists);
    onTasksChanged?.();
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    if (!user) return;

    await saveTaskForUser(user.id, data, editing?.status || 'pendiente', editing?.id);
    setShowForm(false);
    setEditing(null);
    void loadData();
  };

  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    await toggleTaskCompletion(task);
    void loadData();
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Eliminar esta tarea?')) return;
    await removeTask(id);
    void loadData();
  };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => task.status === 'pendiente');
    const overdue = pending.filter((task) => task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) < today);
    const dueToday = pending.filter((task) => task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === today);
    const dueTomorrow = pending.filter((task) => task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === tomorrow);
    const later = pending.filter((task) => !task.fechaVencimiento || task.fechaVencimiento.slice(0, 10) > tomorrow);
    const completed = tasks.filter((task) => task.status === 'completada');
    return { overdue, dueToday, dueTomorrow, later, completed, pending };
  }, [tasks, today, tomorrow]);

  const filtered = useMemo(() => {
    const all = [...stats.overdue, ...stats.dueToday, ...stats.dueTomorrow, ...stats.later];
    if (filter === 'completada') return stats.completed;
    if (filter === 'todas') return [...all, ...stats.completed];
    return all;
  }, [stats, filter]);

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <div className="flex gap-1.5 mr-2 self-center">
          {stats.overdue.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-red-200">{stats.overdue.length} vencida{stats.overdue.length > 1 ? 's' : ''}</span>
          )}
          {stats.dueToday.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-200">{stats.dueToday.length} hoy</span>
          )}
          {stats.dueTomorrow.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-200">{stats.dueTomorrow.length} manana</span>
          )}
        </div>
        <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
          {Icon.Plus()} Tarea
        </button>
      </div>

      <div className="flex gap-1 mb-3 border-b border-line">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium border-b-[2px] transition-all -mb-[1px] ${
              filter === key ? `border-primary text-ink` : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            {label}
            {key === 'pendiente' && stats.pending.length > 0 && (
              <span className="ml-1 text-[10px] text-ink-secondary">({stats.pending.length})</span>
            )}
            {key === 'completada' && stats.completed.length > 0 && (
              <span className="ml-1 text-[10px] text-ink-secondary">({stats.completed.length})</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <TaskForm
          task={editing}
          leads={leads}
          lists={lists}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <div className="space-y-4">
        {filter === 'pendiente' && (
          <>
            {stats.overdue.length > 0 && (
              <TaskSection title="Vencidas" color="red" tasks={stats.overdue} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.dueToday.length > 0 && (
              <TaskSection title="Hoy" color="amber" tasks={stats.dueToday} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.dueTomorrow.length > 0 && (
              <TaskSection title="Manana" color="blue" tasks={stats.dueTomorrow} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.later.length > 0 && (
              <TaskSection title="Pendientes" color="gray" tasks={stats.later} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.pending.length === 0 && (
              <p className="text-center text-ink-secondary py-8">No hay tareas pendientes.</p>
            )}
          </>
        )}
        {filter === 'completada' && (
          stats.completed.length === 0 ? (
            <p className="text-center text-ink-secondary py-8">No hay tareas completadas.</p>
          ) : (
            stats.completed.map((task) => (
              <TaskCard key={task.id} task={task} isOverdue={false} isToday={false} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            ))
          )
        )}
        {filter === 'todas' && (
          filtered.length === 0 ? (
            <p className="text-center text-ink-secondary py-8">No hay tareas.</p>
          ) : (
            filtered.map((task) => {
              const isOverdue = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) < today);
              const isToday = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === today);
              return (
                <TaskCard key={task.id} task={task} isOverdue={isOverdue} isToday={isToday} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={handleDelete} />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
