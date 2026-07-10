import { useEffect, useState, useMemo } from 'react';
import { db } from '../db/database';
import type { Task, TaskStatus, Lead, LeadList } from '../types';
import { Icon } from '../utils/icons';
import TaskForm from '../components/tasks/TaskForm';
import TaskSection from '../components/tasks/TaskSection';
import TaskCard from '../components/tasks/TaskCard';

const STATUS_TABS: { key: TaskStatus | 'todas'; label: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendientes', color: 'text-amber-600' },
  { key: 'completada', label: 'Completadas', color: 'text-green-600' },
  { key: 'todas', label: 'Todas', color: 'text-gray-600' },
];

export default function TasksPage({ onTasksChanged }: { onTasksChanged?: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('pendiente');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [t, l, lst] = await Promise.all([
      db.tasks.orderBy('fechaVencimiento').reverse().toArray(),
      db.leads.toArray(),
      db.leadLists.toArray(),
    ]);
    setTasks(t);
    setLeads(l);
    setLists(lst);
    onTasksChanged?.();
  };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const now = new Date().toISOString();
    const taskData = {
      ...data,
      status: editing?.status || 'pendiente' as const,
      createdAt: editing?.createdAt || now,
    };
    if (editing?.id) {
      await db.tasks.update(editing.id, taskData);
    } else {
      await db.tasks.add(taskData);
    }
    setShowForm(false);
    setEditing(null);
    loadData();
  };

  const toggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    await db.tasks.update(task.id!, { status: newStatus });
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    await db.tasks.delete(id);
    loadData();
  };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pendiente');
    const overdue = pending.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < today);
    const dueToday = pending.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === today);
    const dueTomorrow = pending.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === tomorrow);
    const later = pending.filter((t) => !t.fechaVencimiento || t.fechaVencimiento.slice(0, 10) > tomorrow);
    const completed = tasks.filter((t) => t.status === 'completada');
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
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Tareas</h2>
          <div className="flex gap-1.5">
            {stats.overdue.length > 0 && (
              <span className="bg-red-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{stats.overdue.length} vencida{stats.overdue.length > 1 ? 's' : ''}</span>
            )}
            {stats.dueToday.length > 0 && (
              <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{stats.dueToday.length} hoy</span>
            )}
            {stats.dueTomorrow.length > 0 && (
              <span className="bg-blue-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{stats.dueTomorrow.length} mañana</span>
            )}
          </div>
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1">
          {Icon.Plus()} Nueva Tarea
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b">
        {STATUS_TABS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              filter === key ? `border-current ${color}` : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
            {key === 'pendiente' && stats.pending.length > 0 && (
              <span className="ml-1 text-[10px] text-gray-400">({stats.pending.length})</span>
            )}
            {key === 'completada' && stats.completed.length > 0 && (
              <span className="ml-1 text-[10px] text-gray-400">({stats.completed.length})</span>
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
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Task list with sections */}
      <div className="space-y-4">
        {filter === 'pendiente' && (
          <>
            {stats.overdue.length > 0 && (
              <TaskSection title="Vencidas" color="red" tasks={stats.overdue} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.dueToday.length > 0 && (
              <TaskSection title="Hoy" color="amber" tasks={stats.dueToday} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.dueTomorrow.length > 0 && (
              <TaskSection title="Mañana" color="blue" tasks={stats.dueTomorrow} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.later.length > 0 && (
              <TaskSection title="Pendientes" color="gray" tasks={stats.later} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            )}
            {stats.pending.length === 0 && (
              <p className="text-center text-gray-400 py-8">No hay tareas pendientes.</p>
            )}
          </>
        )}
        {filter === 'completada' && (
          stats.completed.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay tareas completadas.</p>
          ) : (
            stats.completed.map((task) => (
              <TaskCard key={task.id} task={task} isOverdue={false} isToday={false} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
            ))
          )
        )}
        {filter === 'todas' && (
          filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay tareas.</p>
          ) : (
            filtered.map((task) => {
              const isOverdue = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) < today);
              const isToday = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === today);
              return (
                <TaskCard key={task.id} task={task} isOverdue={isOverdue} isToday={isToday} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete} />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
