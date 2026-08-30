import { useEffect, useMemo, useState } from 'react';
import { getPlatform } from '../platform/registry';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import TaskSection from '../components/tasks/TaskSection';
import { EisenhowerMatrix } from '../components/tasks/EisenhowerMatrix';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskDetailPage } from '../components/tasks/TaskDetailPage';
import { useTaskSections } from '../hooks/useTaskSections';
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
import { Button, Select } from '../design';

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
  /*
   * Se guarda el ID, no el objeto.
   *
   * Con el objeto, cualquier cambio que no pasara por `setViendo` dejaba el
   * panel mostrando datos viejos: mover la tarea de columna recarga `tasks` y
   * el tablero se entera, pero la copia guardada seguia con la seccion
   * anterior. Derivandola de `tasks` en cada render eso no puede pasar.
   */
  const [viendoId, setViendoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('pendiente');

  /*
   * La vista es OTRA cosa que el filtro. El filtro dice que tareas mirar
   * -pendientes, completadas, todas-; la vista dice como. Estaban mezclados en
   * la misma fila de pestanas, y por eso "Matriz" convivia con "Completadas"
   * como si fueran alternativas del mismo tipo.
   */
  const [vista, setVista] = useState<'lista' | 'matriz' | 'tablero'>('lista');
  const secciones = useTaskSections();

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

  /*
   * Abrir una tarea CAMBIA LA PANTALLA; crear una sigue en un modal.
   *
   * No es una inconsistencia: crear es un formulario corto que se responde de
   * una y del que se vuelve enseguida, y cambiar de pantalla por eso hace perder
   * el sitio. Abrir una tarea que ya existe es ir a otro lado -a leerla, a
   * editarla, a marcarla hecha-, y ahi la capa encima estorba.
   */
  const openEdit = (task: Task) => {
    setEditing(task);
    setShowForm(false);
    setViendoId(task.id ?? null);
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
    if (!user) return;
    if (
      !(await getPlatform().dialogs.confirm('Se van con ella sus notas, subtareas y adjuntos.', {
        title: '¿Eliminar esta tarea?',
        confirmLabel: 'Eliminar',
        tone: 'danger',
      }))
    ) {
      return;
    }
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

  /*
   * LA TAREA ABIERTA.
   *
   * Se deriva durante el render y no desde un efecto que llame a `setViendoId`:
   * un efecto para estado derivado pinta primero sin seleccion y corrige
   * despues, o sea un parpadeo en cada entrada.
   *
   * Si el id guardado ya no esta entre las pendientes -la completaste, la
   * borraste, la filtraste- cae sola a la primera, que en `stats.pending` es la
   * mas urgente porque las secciones ya vienen ordenadas por vencimiento. Asi se
   * cumple "siempre hay una abierta" sin dejar el panel en blanco.
   */
  const abierta =
    stats.pending.find((task) => task.id === viendoId) ?? stats.pending[0] ?? null;

  const guardarCambios = (cambios: Partial<Task>) => {
    if (!abierta || !user) return;
    const { id, createdAt, status, ...resto } = { ...abierta, ...cambios };
    void saveTaskForUser(user.id, resto, status, id).then(loadData);
  };

  /*
   * En LISTA el detalle sigue ocupando la pantalla entera, y no es una
   * incoherencia: la lista crece con las tareas que tengas, asi que no hay un
   * alto fijo del que descontar un panel. El tablero y la matriz si lo tienen.
   */
  /*
   * El detalle es una PANTALLA, no un panel debajo del tablero.
   *
   * El panel inferior tenia un problema de fondo: el tablero crece con la
   * columna mas larga, asi que con muchas tareas el detalle quedaba empujado
   * fuera de la vista y el reparto de alto dejaba de existir. Un panel que solo
   * funciona con pocas tareas no es un panel.
   *
   * Vale para las tres vistas, asi que abrir una tarea se comporta igual desde
   * la lista, la matriz y el tablero.
   */
  const viendo = stats.pending.find((t) => t.id === viendoId) ?? null;

  if (viendo) {
    return (
      <TaskDetailPage
        task={viendo}
        sections={secciones.sections}
        leads={leads}
        lists={lists}
        userId={user?.id}
        onVolver={() => { setViendoId(null); setEditing(null); }}
        onGuardar={guardarCambios}
        onToggleComplete={() => {
          void handleToggleComplete(viendo);
          setViendoId(null);
        }}
        onEliminar={() => {
          void handleDelete(viendo.id!);
          setViendoId(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <div className="flex gap-1.5 mr-2 self-center">
          {stats.overdue.length > 0 && (
            <span className="rounded-full border border-state-danger-soft bg-state-danger-soft px-2 py-0.5 text-micro font-semibold text-state-danger-ink">{stats.overdue.length} vencida{stats.overdue.length > 1 ? 's' : ''}</span>
          )}
          {stats.dueToday.length > 0 && (
            <span className="rounded-full border border-state-warning-soft bg-state-warning-soft px-2 py-0.5 text-micro font-semibold text-state-warning-ink">{stats.dueToday.length} hoy</span>
          )}
          {stats.dueTomorrow.length > 0 && (
            <span className="rounded-full border border-state-info-soft bg-state-info-soft px-2 py-0.5 text-micro font-semibold text-ink">{stats.dueTomorrow.length} manana</span>
          )}
        </div>
        <Button variant="primary" onClick={openNew} icon={Icon.Plus()}>
          Tarea
        </Button>
      </div>

      <div className="mb-3 flex items-center justify-end">
        <label className="flex items-center gap-1.5">
          <span className="text-micro text-ink-secondary">Vista</span>
          <Select
            value={vista}
            onChange={(evento) => setVista(evento.target.value as typeof vista)}
            compact
            fullWidth={false}
            aria-label="Vista de las tareas"
          >
            <option value="lista">Lista</option>
            <option value="matriz">Matriz</option>
            <option value="tablero">Tablero</option>
          </Select>
        </label>
      </div>

      {/* Las pestanas de filtro solo mandan sobre la lista. */}
      {vista === 'lista' && (
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

      )}

      {/*
        TABLERO Y MATRIZ VAN PARTIDOS: el mapa arriba, el detalle abajo.
 
        El alto se acota aca y NO metiendo `tasks` en `PAGE_FILL_HEIGHT`. Esa
        constante fuerza `h-full` a la pagina ENTERA, y como en Tareas conviven
        tres vistas, Lista y Matriz -que hoy crecen y dependen del scroll del
        `<main>`- quedarian recortadas sin ninguna barra que lo avisara.
 
        `max-h` en vez de alto fijo: en un panel alto el detalle aprovecha lo que
        sobra, y en uno bajo no desborda.
      */}
      {(vista === 'matriz' || vista === 'tablero') && (
        <div className="flex flex-col gap-2">
          <div>
            {vista === 'matriz' ? (
              <EisenhowerMatrix tasks={stats.pending} onAbrirTarea={openEdit} />
            ) : (
              <TaskBoard
                tasks={stats.pending}
                sections={secciones.sections}
                onAbrirTarea={openEdit}
                onMoverTarea={(taskId, sectionId) => {
                  void secciones.moverTarea(taskId, sectionId).then(loadData);
                }}
                onCrearSeccion={(nombre) => void secciones.crear(nombre)}
                onRenombrarSeccion={(id, nombre) => void secciones.renombrar(id, nombre)}
                onBorrarSeccion={(id) => void secciones.borrar(id)}
              />
            )}
          </div>

        </div>
      )}

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

      {/*
        La matriz solo mira las PENDIENTES. Una tarea hecha no se prioriza, y
        dejarlas dentro llenaria "Eliminar" de trabajo ya terminado.
      */}
      <div className={`space-y-4 ${vista === 'lista' ? '' : 'hidden'}`}>
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
