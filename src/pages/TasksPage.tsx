import { useEffect, useState, useMemo } from 'react';
import { db } from '../db/database';
import type { Task, TaskStatus, Lead, LeadList } from '../types';
import { TASK_STATUS_LABELS } from '../types';
import { Icon } from '../utils/icons';

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

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [leadIds, setLeadIds] = useState<number[]>([]);
  const [leadListIds, setLeadListIds] = useState<number[]>([]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

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

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setLeadIds([]);
    setLeadListIds([]);
    setFechaVencimiento('');
  };

  const openNew = () => { resetForm(); setEditing(null); setShowForm(true); };
  const openEdit = (task: Task) => {
    setTitulo(task.titulo);
    setDescripcion(task.descripcion);
    setLeadIds(task.leadIds || []);
    setLeadListIds(task.leadListIds || []);
    setFechaVencimiento(task.fechaVencimiento ? task.fechaVencimiento.slice(0, 10) : '');
    setEditing(task);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    const now = new Date().toISOString();
    const data = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      leadIds,
      leadListIds,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + 'T23:59:59').toISOString() : '',
      status: editing?.status || 'pendiente' as const,
      createdAt: editing?.createdAt || now,
    };
    if (editing?.id) {
      await db.tasks.update(editing.id, data);
    } else {
      await db.tasks.add(data);
    }
    resetForm();
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

  const renderTask = (task: Task, isOverdue: boolean, isToday: boolean) => (
    <div key={task.id} className={`border rounded-lg p-3 ${task.status === 'completada' ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : isOverdue ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : isToday ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-white dark:bg-gray-900 dark:border-gray-700'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={task.status === 'completada'} onChange={() => toggleComplete(task)} className="mt-0.5 rounded" />
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
          {task.descripcion && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.descripcion}</p>}
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
              <span key={lid} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1 rounded">{lists.find((l) => l.id === lid)?.name || '?'}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => openEdit(task)} className="text-gray-400 hover:text-blue-600 text-xs" title="Editar">{Icon.Edit()}</button>
          <button onClick={() => handleDelete(task.id!)} className="text-gray-400 hover:text-red-600 text-xs" title="Eliminar">{Icon.Trash()}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Tareas</h2>
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
        <button onClick={openNew} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700">
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
        <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="font-semibold mb-3">{editing ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título *</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descripción</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Vencimiento</label>
              <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leads asignados</label>
              <div className="border rounded max-h-32 overflow-y-auto p-1 dark:border-gray-600">
                {leads.filter((l) => !l.deletedAt).map((lead) => (
                  <label key={lead.id} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-xs">
                    <input type="checkbox" checked={leadIds.includes(lead.id!)} onChange={() => setLeadIds((prev) => prev.includes(lead.id!) ? prev.filter((x) => x !== lead.id) : [...prev, lead.id!])} />
                    {lead.name}
                  </label>
                ))}
              </div>
            </div>
            {lists.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Listas asignadas</label>
                <div className="flex flex-wrap gap-1">
                  {lists.map((list) => (
                    <button key={list.id} type="button" onClick={() => setLeadListIds((prev) => prev.includes(list.id!) ? prev.filter((x) => x !== list.id) : [...prev, list.id!])}
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${leadListIds.includes(list.id!) ? 'text-white border-transparent' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`}
                      style={leadListIds.includes(list.id!) ? { backgroundColor: list.color } : {}}>
                      {list.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                {editing ? 'Actualizar' : 'Crear Tarea'}
              </button>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list with sections */}
      <div className="space-y-4">
        {filter === 'pendiente' && (
          <>
            {stats.overdue.length > 0 && (
              <Section title="Vencidas" color="red" tasks={stats.overdue} render={renderTask} />
            )}
            {stats.dueToday.length > 0 && (
              <Section title="Hoy" color="amber" tasks={stats.dueToday} render={renderTask} />
            )}
            {stats.dueTomorrow.length > 0 && (
              <Section title="Mañana" color="blue" tasks={stats.dueTomorrow} render={renderTask} />
            )}
            {stats.later.length > 0 && (
              <Section title="Pendientes" color="gray" tasks={stats.later} render={renderTask} />
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
            stats.completed.map((task) => renderTask(task, false, false))
          )
        )}
        {filter === 'todas' && (
          filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay tareas.</p>
          ) : (
            filtered.map((task) => {
              const isOverdue = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) < today);
              const isToday = !!(task.status === 'pendiente' && task.fechaVencimiento && task.fechaVencimiento.slice(0, 10) === today);
              return renderTask(task, isOverdue, isToday);
            })
          )
        )}
      </div>
    </div>
  );
}

function Section({ title, color, tasks, render }: { title: string; color: string; tasks: Task[]; render: (t: Task, overdue: boolean, today: boolean) => JSX.Element }) {
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
          return render(task, isOverdue, isToday);
        })}
      </div>
    </div>
  );
}
