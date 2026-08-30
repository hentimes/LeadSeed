import { useMemo, useState } from 'react';
import type { Task } from '../../types';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import { DIAS_PARA_URGENTE, cuadranteDe } from '../../utils/taskPriority';

/**
 * Los cuatro cuadrantes, con el verbo que les corresponde.
 *
 * Los verbos son los del metodo, no invenciones: hacer, programar, delegar,
 * eliminar. Son lo que le da sentido a la matriz — el cuadrante no dice donde
 * esta la tarea, dice que hacer con ella.
 *
 * ## Una salvedad sobre "delegar"
 *
 * En el metodo original, lo urgente pero no importante se le pasa a otro. Las
 * tareas de LeadSeed no tienen a quien asignarse, asi que ese verbo no tiene
 * mecanismo detras. Se conserva la casilla -es la que enseña que hay trabajo
 * urgente que no te acerca a nada- pero el verbo se dice como "despachar":
 * sacarselo de encima rapido, que es lo unico que se puede hacer hoy.
 */
const CUADRANTES = [
  {
    id: 'hacer',
    titulo: 'Hacer',
    detalle: 'Urgente e importante',
    acento: 'bg-state-danger',
  },
  {
    id: 'programar',
    titulo: 'Programar',
    detalle: 'Importante, no urgente',
    acento: 'bg-state-info',
  },
  {
    id: 'despachar',
    titulo: 'Despachar',
    detalle: 'Urgente, no importante',
    acento: 'bg-state-warning-ink',
  },
  {
    id: 'eliminar',
    titulo: 'Eliminar',
    detalle: 'Ni urgente ni importante',
    acento: 'bg-ink-muted',
  },
] as const;

/** Cuantas tareas se asoman en cada cuadrante. */
const VISIBLES = 4;

/**
 * LA MATRIZ DE EISENHOWER
 *
 * ## Por que aca si, y en el pipeline no
 *
 * Una matriz de Eisenhower cruza DOS ejes independientes, y cada cuadrante es
 * una combinacion de los dos. Las etapas del pipeline no servian: son un solo
 * eje -una secuencia- y ponerlas en 2x2 era empaquetado, no cruce.
 *
 * Una tarea si tiene los dos: la urgencia sale de la fecha de vencimiento y la
 * importancia del campo que agrego la migracion 131. Son independientes de
 * verdad, que es justo lo que hace util a la matriz: lo urgente tapa a lo
 * importante cuando se los mezcla en una sola lista ordenada por fecha.
 *
 * ## No reemplaza a la lista
 *
 * La lista es donde se trabaja: tiene los filtros, el orden y las acciones por
 * tarea. La matriz es donde se mira el reparto y se decide que sacarse de
 * encima. Son dos preguntas distintas sobre los mismos datos.
 *
 * Por eso los cuadrantes asoman cuatro tareas y no todas: quien quiere la lista
 * completa la tiene al lado, y un cuadrante con scroll interno esconderia
 * tareas sin ninguna pista, porque los scrollbars estan ocultos en el producto.
 *
 * ## Que cuenta como urgente
 *
 * Vencida o vence dentro de los proximos dos dias. Una tarea sin fecha no es
 * urgente: no tener plazo es exactamente lo contrario.
 */
export function EisenhowerMatrix({
  tasks,
  onAbrirTarea,
}: {
  /** Solo las pendientes: una tarea hecha ya no se prioriza. */
  tasks: Task[];
  onAbrirTarea: (task: Task) => void;
}) {
  /*
   * El reparto lo decide `cuadranteDe`, que es la misma funcion que usa el
   * formulario para explicar la urgencia mientras elegis la fecha. Con la regla
   * escrita dos veces, las dos pantallas podrian discrepar sobre que es urgente.
   */
  const repartidas = useMemo(() => {
    const ahora = Date.now();
    return CUADRANTES.map((cuadrante) => ({
      ...cuadrante,
      tareas: tasks.filter((task) => cuadranteDe(task, ahora) === cuadrante.id),
    }));
  }, [tasks]);

  const sinImportancia = tasks.every((task) => !task.importante);
  const [reglaVisible, setReglaVisible] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/*
        Sin ninguna tarea marcada como importante, la matriz existe pero no dice
        nada: todo cae en la fila de abajo. Conviene decirlo en vez de dejar dos
        cuadrantes vacios sin explicacion.
      */}
      {tasks.length > 0 && sinImportancia && (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-meta text-ink-secondary">
          Todavía no marcaste ninguna tarea como importante, así que todas caen abajo. Se marca al
          crearla o editarla.
        </p>
      )}

      {/*
        La regla de urgencia, a pedido.
 
        Estaba siempre a la vista y era una linea que se lee una vez y despues
        estorba todos los dias. Pero tampoco puede vivir en un `title`: eso no
        existe en tactil ni con teclado, y aca hay que poder consultarlo. Un
        boton que la muestra y la esconde funciona en los tres casos.
      */}
      {tasks.length > 0 && (
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => setReglaVisible((estaba) => !estaba)}
            aria-expanded={reglaVisible}
            title="Cómo se reparten las tareas"
            aria-label="Cómo se reparten las tareas"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-micro text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
          >
            <Icon.Help />
          </button>

          {reglaVisible && (
            <p className="min-w-0 flex-1 text-micro text-ink-secondary">
              Urgente = vencida o vence dentro de {DIAS_PARA_URGENTE} días. La importancia la marcás
              vos al crear o editar la tarea.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {repartidas.map((cuadrante) => (
          <div
            key={cuadrante.id}
            className="flex flex-col overflow-hidden rounded-md border border-line bg-surface shadow-card"
          >
            <span aria-hidden="true" className={`h-1 w-full shrink-0 ${cuadrante.acento}`} />

            <div className="px-2 pb-1 pt-2">
              <div className="flex items-center justify-between gap-1">
                <span className="min-w-0 truncate text-meta font-semibold text-ink">
                  {cuadrante.titulo}
                </span>
                <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-micro font-semibold tabular-nums text-ink-secondary">
                  {cuadrante.tareas.length}
                </span>
              </div>
              <p className="truncate text-micro text-ink-secondary">{cuadrante.detalle}</p>
            </div>

            <div className="flex min-h-[104px] flex-col gap-1 px-2 pb-2">
              {cuadrante.tareas.length === 0 ? (
                <p className="pt-5 text-center text-meta text-ink-secondary">Nada acá</p>
              ) : (
                <>
                  {cuadrante.tareas.slice(0, VISIBLES).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onAbrirTarea(task)}
                      title={task.titulo}
                      /*
                        Acento a la IZQUIERDA, no arriba: es lo que distingue a
                        una ficha de la matriz de una de la lista, que comparten
                        alto y tipografia. El color repite el del cuadrante, asi
                        que una tarea arrastrada de contexto -copiada, contada a
                        alguien- sigue diciendo de que casilla salio.
                      */
                      className="relative flex h-7 shrink-0 items-center overflow-hidden rounded-md bg-surface-sunken pl-2.5 pr-1.5 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-[3px] ${cuadrante.acento}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-meta text-ink">
                        {nombreVisible(task.titulo)}
                      </span>
                    </button>
                  ))}

                  {cuadrante.tareas.length > VISIBLES && (
                    <p className="px-1.5 pt-0.5 text-micro text-ink-secondary">
                      y {cuadrante.tareas.length - VISIBLES} más
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
