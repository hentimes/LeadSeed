import type { Task, Lead, LeadList } from '../../types';
import { Icon } from '../../utils/icons';
import { formatearFecha, formatearHora } from '../../utils/date';

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

/**
 * UNA TAREA
 *
 * ## Que se compacto
 *
 * La ficha medía unos 95px: relleno de 12, titulo con su pastilla, descripcion
 * en su propia linea, la fecha entera en otra ("Venció: 21-08-2026, 11:59 p.
 * m.") y los chips de lead en una cuarta. Cuatro filas apiladas para una tarea
 * de la que casi siempre solo mirás el titulo y si esta vencida.
 *
 * Ahora son tres lineas y unos 58px. La fecha se abrevia -el ano y los segundos
 * no informan nada en una lista de tareas de esta semana- y los chips comparten
 * linea con ella.
 *
 * ## Se fueron las pastillas de colores
 *
 * Eran texto blanco sobre relleno saturado. Medido: VENCIDA daba 4.83:1 y
 * pasaba, pero HOY daba 2.15, MAÑANA 3.68 y COMPLETADA 2.28, todas a 10px.
 * Tres de cuatro incumplian.
 *
 * Y ademas sobraban: "VENCIDA" se decia CUATRO veces a la vez -el rotulo de la
 * seccion, el borde rojo, el fondo rojo y la pastilla-. Queda una: la propia
 * linea de fecha, en color de estado, que es la que ya lo explicaba.
 *
 * ## Se fue el fondo tenido, y esto era un bug
 *
 * `bg-red-50` y `bg-amber-50` son literales que NO siguen al tema. En modo
 * oscuro el texto del producto sobre ellos daba 1.00:1 y 1.06:1: la ficha
 * vencida era, literalmente, blanco sobre blanco.
 *
 * En su lugar un filete de 3px a la izquierda, que es la misma solucion que el
 * tablero: color a saturacion plena, sin tenir el fondo, y siguiendo al tema.
 */
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
  const completada = task.status === 'completada';
  const esManana = !isOverdue && !isToday && task.fechaVencimiento?.slice(0, 10) === tomorrow;

  /*
   * El filete dice el estado sin tenir nada. `completada` no lleva: una tarea
   * hecha no necesita seguir llamando la atencion.
   */
  const filete = completada
    ? 'bg-transparent'
    : isOverdue
      ? 'bg-state-danger'
      : isToday
        ? 'bg-state-warning-ink'
        : 'bg-transparent';

  const tonoDeFecha = isOverdue
    ? 'text-state-danger font-medium'
    : isToday
      ? 'text-state-warning-ink font-medium'
      : 'text-ink-muted';

  const cuando = task.fechaVencimiento
    ? `${isOverdue ? 'Venció' : 'Vence'} ${
        isToday ? `hoy ${formatearHora(task.fechaVencimiento)}` : formatearFecha(task.fechaVencimiento)
      }`
    : '';

  const etiquetas = [
    ...(task.leadIds ?? []).map((id) => leads.find((l) => l.id === id)?.name),
    ...(task.leadListIds ?? []).map((id) => lists.find((l) => l.id === id)?.name),
  ].filter(Boolean);

  return (
    <div className="relative flex items-start gap-2 overflow-hidden rounded-md border border-line bg-surface py-2 pl-3 pr-2">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${filete}`} />

      <input
        type="checkbox"
        checked={completada}
        onChange={() => onToggleComplete(task)}
        aria-label={`Marcar ${task.titulo} como ${completada ? 'pendiente' : 'completada'}`}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
      />

      <div className="min-w-0 flex-1">
        {/*
          `line-through` sin `opacity`: una tarea completada tiene que seguir
          siendo legible. Atenuar con opacidad deja el texto por debajo del
          minimo, y ademas la raya ya dice todo lo que hay que decir.
        */}
        <p className={`truncate text-body font-medium ${completada ? 'text-ink-muted line-through' : 'text-ink'}`}>
          {task.titulo}
        </p>

        {task.descripcion && (
          <p className="truncate text-meta text-ink-secondary">{task.descripcion}</p>
        )}

        {(cuando || esManana || etiquetas.length > 0) && (
          <p className="truncate text-micro">
            {cuando && <span className={tonoDeFecha}>{cuando}</span>}
            {esManana && <span className="text-ink-secondary"> · mañana</span>}
            {etiquetas.length > 0 && (
              <span className="text-ink-muted">
                {cuando ? ' · ' : ''}
                {etiquetas.join(' · ')}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onEdit(task)}
          title="Editar"
          aria-label={`Editar ${task.titulo}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          {Icon.Edit()}
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id!)}
          title="Eliminar"
          aria-label={`Eliminar ${task.titulo}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          {Icon.Trash()}
        </button>
      </div>
    </div>
  );
}
