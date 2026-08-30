import { useState } from 'react';
import type { Task, TaskSection } from '../../types';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';
import { BoardScroller } from './BoardScroller';

/**
 * Ancho de una columna, en pixeles.
 *
 * En los 336 utiles entran dos y se asoma bien la tercera, que es la senal de
 * que el tablero sigue. Mas angosto el titulo de la tarea queda en unos doce
 * caracteres y dos tareas parecidas dejan de distinguirse.
 */
const ANCHO_COLUMNA = 138;

/** La columna de las tareas que no estan en ninguna seccion. */
const SIN_SECCION = '__sin_seccion__';

/**
 * TABLERO POR SECCIONES
 *
 * Columnas de verdad, una al lado de la otra, con scroll horizontal.
 *
 * ## El scroll horizontal y los scrollbars ocultos
 *
 * El producto oculta los scrollbars, asi que un desplazamiento lateral no se
 * anuncia solo: sin ninguna pista, las columnas de la derecha directamente no
 * existen para quien mira.
 *
 * Se compensa con tres cosas, y ninguna es decorativa:
 *
 *  1. Las columnas se cortan a proposito. La ultima visible asoma un pedazo en
 *     el borde, que es la senal mas barata y mas clara de que hay mas.
 *  2. `snap` en cada columna, para que el desplazamiento se detenga alineado y
 *     no a mitad de una tarjeta.
 *  3. La columna de "Agregar seccion" cierra la fila, asi que el final del
 *     tablero se reconoce cuando se llega.
 *
 * ## El control de desplazamiento
 *
 * Ademas de esas tres senales pasivas, `BoardScroller` dibuja flechas y una
 * barra propia. Las senales pasivas dicen que hay mas; el control es lo que
 * deja llegar sin rueda horizontal ni gesto de trackpad.
 *
 * ## Mover
 *
 * Se arrastra una tarjeta a otra columna. Y como arrastrar no existe en tactil
 * ni con teclado, tocar la tarjeta abre su detalle, desde donde tambien se
 * cambia: el arrastre es el atajo, no el unico camino.
 */
export function TaskBoard({
  tasks,
  sections,
  onAbrirTarea,
  onMoverTarea,
  onCrearSeccion,
  onRenombrarSeccion,
  onBorrarSeccion,
}: {
  tasks: Task[];
  sections: TaskSection[];
  onAbrirTarea: (task: Task) => void;
  onMoverTarea: (taskId: string, sectionId: string | null) => void;
  onCrearSeccion: (nombre: string) => void;
  onRenombrarSeccion: (id: string, nombre: string) => void;
  onBorrarSeccion: (id: string) => void;
}) {
  const [destino, setDestino] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [nuevaSeccion, setNuevaSeccion] = useState('');
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState<{ id: string; nombre: string } | null>(null);

  const sueltas = tasks.filter((task) => !task.sectionId);

  /*
   * "Sin seccion" va PRIMERA, y solo si tiene algo. Es donde caen las tareas
   * nuevas y las que quedaron sueltas al borrar una columna: la bandeja de
   * entrada del tablero. Vacia no aporta nada y gastaria una columna de las
   * dos que se ven.
   */
  const columnas = [
    ...(sueltas.length > 0
      ? [{ id: SIN_SECCION, name: 'Sin sección', borrable: false }]
      : []),
    ...sections.map((seccion) => ({ id: seccion.id, name: seccion.name, borrable: true })),
  ];

  const tareasDe = (columnaId: string) =>
    columnaId === SIN_SECCION ? sueltas : tasks.filter((task) => task.sectionId === columnaId);

  const soltarEn = (columnaId: string) => {
    setDestino(null);
    const taskId = arrastrando;
    setArrastrando(null);
    if (!taskId) return;
    onMoverTarea(taskId, columnaId === SIN_SECCION ? null : columnaId);
  };

  return (
    <BoardScroller>
      {columnas.map((columna) => {
        const suyas = tareasDe(columna.id);
        const esDestino = destino === columna.id;

        return (
          <section
            key={columna.id}
            style={{ width: ANCHO_COLUMNA }}
            onDragOver={(evento) => {
              evento.preventDefault();
              setDestino(columna.id);
            }}
            onDragLeave={() => setDestino(null)}
            onDrop={(evento) => {
              evento.preventDefault();
              soltarEn(columna.id);
            }}
            className={`tablero-imantado flex shrink-0 snap-start flex-col rounded-md border transition-colors ${
              esDestino
                ? 'border-transparent bg-primary-soft ring-2 ring-inset ring-primary-ink'
                : 'border-line bg-surface-sunken'
            }`}
          >
            <div className="flex items-center gap-0.5 px-2 py-1.5">
              {renombrando?.id === columna.id ? (
                <input
                  value={renombrando.nombre}
                  onChange={(evento) => setRenombrando({ id: columna.id, nombre: evento.target.value })}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' && renombrando.nombre.trim()) {
                      onRenombrarSeccion(columna.id, renombrando.nombre.trim());
                      setRenombrando(null);
                    }
                    if (evento.key === 'Escape') setRenombrando(null);
                  }}
                  onBlur={() => setRenombrando(null)}
                  aria-label={`Nuevo nombre para ${columna.name}`}
                  autoFocus
                  className="min-w-0 flex-1 rounded border border-primary-soft bg-surface px-1 py-0.5 text-micro text-ink outline-none focus:ring-1 focus:ring-focus"
                />
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-micro font-semibold text-ink">
                    {columna.name}
                  </span>
                  <span className="shrink-0 text-micro tabular-nums text-ink-secondary">
                    {suyas.length}
                  </span>

                  {columna.borrable && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRenombrando({ id: columna.id, nombre: columna.name })}
                        title={`Renombrar ${columna.name}`}
                        aria-label={`Renombrar ${columna.name}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
                      >
                        {Icon.Edit()}
                      </button>
                      <button
                        type="button"
                        onClick={() => onBorrarSeccion(columna.id)}
                        title={`Borrar ${columna.name}`}
                        aria-label={`Borrar la sección ${columna.name}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger [&_svg]:h-2.5 [&_svg]:w-2.5"
                      >
                        {Icon.Trash()}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/*
              La columna crece con su contenido y NO tiene scroll propio: dos
              scrolls anidados, y encima invisibles, esconden tareas sin dejar
              rastro. Si una columna se hace larga, la pagina scrollea.
            */}
            <div className="flex flex-col gap-1 px-1.5 pb-1.5">
              {suyas.length === 0 ? (
                <p className="px-1 py-4 text-center text-micro text-ink-secondary">
                  Soltá tareas acá
                </p>
              ) : (
                suyas.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable
                    onDragStart={() => setArrastrando(task.id!)}
                    onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                    onClick={() => onAbrirTarea(task)}
                    title={`${task.titulo} — abrir`}
                    className={`relative flex cursor-grab items-start gap-1 overflow-hidden rounded-md border border-line bg-surface py-1.5 pl-2 pr-1 text-left shadow-sm transition-colors hover:bg-surface-hover active:cursor-grabbing ${
                      arrastrando === task.id ? 'opacity-0' : ''
                    }`}
                  >
                    {/* El color de la tarea, de filete: identidad, no dato. */}
                    {task.color && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: task.color }}
                      />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-medium leading-tight text-ink">
                        {task.titulo}
                      </span>
                      {task.fechaVencimiento && (
                        <span className="block truncate text-[10px] leading-tight text-ink-secondary">
                          {formatearFecha(task.fechaVencimiento)}
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 shrink-0 text-ink-muted [&_svg]:h-2.5 [&_svg]:w-2.5">
                      {Icon.View()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        );
      })}

      {/* Cierra la fila: llegar a esta columna es la senal de que no hay mas. */}
      {/*
        `self-start` y `pt-px`: sin eso el contenedor se estira al alto de la
        columna mas alta -es un hijo de un flex- y el campo de nombre quedaba
        pegado al borde de arriba, con su anillo de foco recortado por el
        contenedor que hace el scroll.
      */}
      <div style={{ width: ANCHO_COLUMNA }} className="shrink-0 snap-start self-start pt-px">
        {creando ? (
          <input
            value={nuevaSeccion}
            onChange={(evento) => setNuevaSeccion(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && nuevaSeccion.trim()) {
                onCrearSeccion(nuevaSeccion.trim());
                setNuevaSeccion('');
                setCreando(false);
              }
              if (evento.key === 'Escape') { setNuevaSeccion(''); setCreando(false); }
            }}
            onBlur={() => { setNuevaSeccion(''); setCreando(false); }}
            placeholder="Nombre"
            aria-label="Nombre de la sección nueva"
            autoFocus
            className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-micro text-ink outline-none focus:ring-1 focus:ring-focus"
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line px-2 py-1.5 text-micro text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
          >
            <span className="[&_svg]:h-2.5 [&_svg]:w-2.5">{Icon.Plus()}</span>
            Sección
          </button>
        )}
      </div>
    </BoardScroller>
  );
}
