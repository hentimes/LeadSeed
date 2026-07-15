import { useEffect, useState, useMemo } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import { supabase } from '../lib/supabaseClient';
import type { Task, TaskStatus, Lead, LeadList } from '../types';
import { Icon } from '../utils/icons';
import TaskForm from '../components/tasks/TaskForm';
import TaskSection from '../components/tasks/TaskSection';
import TaskCard from '../components/tasks/TaskCard';
import { useAuth } from '../contexts/AuthContext';

const STATUS_TABS: { key: TaskStatus | 'todas'; label: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendientes', color: 'text-amber-600' },
  { key: 'completada', label: 'Completadas', color: 'text-green-600' },
  { key: 'todas', label: 'Todas', color: 'text-gray-600' },
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
    if (user) loadData(); 
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    const dbTasks = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false });
      
    const fetchedLeads = await getLeads();
    const fetchedLists = await getLists();
    
    const mappedTasks: Task[] = (dbTasks.data || []).map(t => ({
      id: t.id,
      titulo: t.title,
      descripcion: t.description || '',
      status: t.status as TaskStatus,
      fechaVencimiento: t.due_date || '',
      leadIds: t.lead_id ? [t.lead_id] : [],
      leadListIds: t.lead_list_ids || [],
      createdAt: t.created_at
    }));

    setTasks(mappedTasks);
    setLeads(fetchedLeads);
    setLists(fetchedLists);
    onTasksChanged?.();
  };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    if (!user) return;
    const now = new Date().toISOString();
    
    const dbRow = {
      title: data.titulo,
      description: data.descripcion,
      status: editing?.status || 'pendiente',
      due_date: data.fechaVencimiento || null,
      lead_id: data.leadIds.length > 0 ? data.leadIds[0] : null,
      lead_list_ids: data.leadListIds || [],
      user_id: user.id
    };

    if (editing?.id) {
      await supabase.from('tasks').update(dbRow).eq('id', editing.id);
    } else {
      await supabase.from('tasks').insert({ ...dbRow, created_at: now });
    }
    
    setShowForm(false);
    setEditing(null);
    loadData();
  };

  const toggleComplete = async (task: Task) => {
    if (!user) return;
    const newStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id!);
    loadData();
  };

  const handleDelete = async (id: string | number) => {
    if (!user || !confirm('¿Eliminar esta tarea?')) return;
    await supabase.from('tasks').delete().eq('id', id);
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
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Tareas</h2>
            <p className="text-sm text-gray-500 mt-1">Gestiona tus seguimientos y recordatorios.</p>
          </div>
          <div className="flex gap-1.5 self-start mt-1">
            {stats.overdue.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-red-200">{stats.overdue.length} vencida{stats.overdue.length > 1 ? 's' : ''}</span>
            )}
            {stats.dueToday.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-200">{stats.dueToday.length} hoy</span>
            )}
            {stats.dueTomorrow.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-200">{stats.dueTomorrow.length} mañana</span>
            )}
          </div>
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
          {Icon.Plus()} Tarea
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
              <TaskSection title="Vencidas" color="red" tasks={stats.overdue} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
            )}
            {stats.dueToday.length > 0 && (
              <TaskSection title="Hoy" color="amber" tasks={stats.dueToday} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
            )}
            {stats.dueTomorrow.length > 0 && (
              <TaskSection title="Mañana" color="blue" tasks={stats.dueTomorrow} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
            )}
            {stats.later.length > 0 && (
              <TaskSection title="Pendientes" color="gray" tasks={stats.later} leads={leads} lists={lists} tomorrow={tomorrow} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
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
              <TaskCard key={task.id} task={task} isOverdue={false} isToday={false} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
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
                <TaskCard key={task.id} task={task} isOverdue={isOverdue} isToday={isToday} tomorrow={tomorrow} leads={leads} lists={lists} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={handleDelete as any} />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
