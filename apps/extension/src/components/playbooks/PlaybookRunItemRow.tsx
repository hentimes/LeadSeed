import { useEffect, useState } from 'react';
import { ToggleIconButton } from '../../design';
import { Icon } from '../../utils/icons';
import type { PlaybookRunItem, PlaybookRunItemState, PlaybookSelection } from '../../types';
import PlaybookAnswerBody, { ocultaPregunta } from './answers/PlaybookAnswerBody';

/**
 * Un punto del guion. Fila compacta; se despliega para leer la pregunta.
 *
 * ## Marcar y abrir son cosas distintas
 *
 * Los dos botones -check y prohibido- viven EN LA FILA, no dentro del panel.
 * Antes marcar obligaba a desplegar, asi que un punto ya resuelto no se podia
 * volver a mirar sin re-marcarlo, y lo escrito quedaba enterrado. Ahora el
 * titulo abre y cierra, los botones marcan, y las dos cosas no se estorban.
 *
 * Tocar el titulo funciona igual en un punto resuelto que en uno pendiente:
 * releer lo que anotaste hace tres dias es justo lo que hace falta al retomar.
 *
 * ## El color no es el unico portador del dato (WCAG 1.4.1)
 *
 * Ademas del verde y el rojo estan la FORMA de cada icono -check contra
 * circulo cruzado-, el relleno del boton activo, el tachado del titulo -solido
 * lo hecho, punteado y en cursiva lo descartado- y `aria-pressed`.
 *
 * ## Densidad
 *
 * `py-1` y una sola linea de titulo: veinte puntos tienen que caber en una
 * pantalla del panel sin desplazarse. Por eso tambien el rotulo de la fase no
 * se repite aqui: ya esta una vez en la cabecera pegajosa de arriba.
 */

const ICONO_DE_ESTADO: Record<PlaybookRunItemState, string> = {
  pendiente: 'text-ink-muted opacity-40',
  hecho: 'text-state-success-ink',
  no_aplica: 'text-state-danger-ink',
};

function clasesDelTitulo(state: PlaybookRunItemState): string {
  if (state === 'hecho') return 'text-ink-muted line-through decoration-2';
  if (state === 'no_aplica') return 'text-ink-muted italic line-through decoration-dashed';
  return 'text-ink';
}

interface Props {
  item: PlaybookRunItem;
  /** Todos los del recorrido: el checkpoint necesita leer lo respondido arriba. */
  todos: readonly PlaybookRunItem[];
  abierto: boolean;
  guardando: boolean;
  soloLectura: boolean;
  onToggle: () => void;
  onMarcar: (state: PlaybookRunItemState) => void;
  onGuardarNota: (note: string) => void;
  onGuardarSelecciones: (selecciones: PlaybookSelection[]) => void;
  onGuardarTextoDeCheckpoint: (texto: string | null) => void;
}

export default function PlaybookRunItemRow({
  item,
  todos,
  abierto,
  guardando,
  soloLectura,
  onToggle,
  onMarcar,
  onGuardarNota,
  onGuardarSelecciones,
  onGuardarTextoDeCheckpoint,
}: Props) {
  const [nota, setNota] = useState(item.note ?? '');

  useEffect(() => {
    setNota(item.note ?? '');
  }, [item.id, item.note]);

  const panelId = `punto-${item.id}-panel`;
  const guardarSiCambio = () => {
    if (nota.trim() !== (item.note ?? '').trim()) onGuardarNota(nota);
  };

  return (
    <li>
      <div className="flex min-w-0 items-center gap-1.5 pl-2 pr-1.5">
        <button
          type="button"
          id={`punto-${item.id}-disparador`}
          aria-expanded={abierto}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        >
          <span aria-hidden="true" className={`shrink-0 ${ICONO_DE_ESTADO[item.state]}`}>
            {Icon.CircleEmpty()}
          </span>
          <span className={`min-w-0 flex-1 truncate text-body ${clasesDelTitulo(item.state)}`}>
            {item.title}
          </span>
          {/* Sin abrirlo no habria forma de saber que este punto tiene algo
              escrito, y lo anotado es la mitad del valor del recorrido. */}
          {!!item.note && (
            <span aria-label="Tiene nota" title="Tiene nota" className="shrink-0 text-ink-muted opacity-60">
              {Icon.Edit()}
            </span>
          )}
        </button>

        <ToggleIconButton
          active={item.state === 'hecho'}
          tono="success"
          icon={Icon.Check()}
          disabled={soloLectura || guardando}
          aria-pressed={item.state === 'hecho'}
          aria-label={`Marcar "${item.title}" como hecho`}
          title={`Marcar "${item.title}" como hecho`}
          onClick={() => onMarcar(item.state === 'hecho' ? 'pendiente' : 'hecho')}
        />
        <ToggleIconButton
          active={item.state === 'no_aplica'}
          tono="danger"
          icon={Icon.Ban()}
          disabled={soloLectura || guardando}
          aria-pressed={item.state === 'no_aplica'}
          aria-label={`Marcar "${item.title}" como no aplica`}
          title={`Marcar "${item.title}" como no aplica`}
          onClick={() => onMarcar(item.state === 'no_aplica' ? 'pendiente' : 'no_aplica')}
        />
      </div>

      {abierto && (
        <div id={panelId} className="border-t border-line bg-surface-muted px-3 py-2">
          {/* La pregunta es CONTEXTO, no protagonista: en `text-meta` y gris no
              compite con la respuesta, que es lo que se mira. Y en el checkpoint
              no se pinta: su pregunta es la misma frase con huecos que la
              generada de debajo ya trae rellenos. */}
          {!ocultaPregunta(item.answerType) && (
            <p className="text-meta font-semibold leading-snug text-ink-secondary">
              {item.question}
            </p>
          )}

          {/* Que se pinta debajo de la pregunta lo decide el despachador: hay
              cinco formas de responder y esta fila no tiene por que conocerlas. */}
          <PlaybookAnswerBody
            item={item}
            todos={todos}
            soloLectura={soloLectura}
            nota={nota}
            onCambiarNota={setNota}
            onGuardarNota={guardarSiCambio}
            onGuardarSelecciones={onGuardarSelecciones}
            onGuardarTextoDeCheckpoint={onGuardarTextoDeCheckpoint}
          />
        </div>
      )}
    </li>
  );
}
