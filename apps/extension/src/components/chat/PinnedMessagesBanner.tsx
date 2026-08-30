import { useEffect, useRef, useState } from 'react';
import { ChatIcon } from './ChatIcons';
import { toPlainText } from '../../utils/mentionParser';
import type { ChatPinnedMessage } from '../../types';

interface PinnedMessagesBannerProps {
  pinned: ChatPinnedMessage[];
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}

/** Alto de una fila, en pixeles. Fijo: es lo que hace posible la rueda. */
const ALTO_FILA = 30;

/** Cada cuanto pasa al siguiente fijado. */
const MS_ENTRE_FIJADOS = 5000;

/**
 * MENSAJES FIJADOS
 *
 * ## Se fue el fondo amarillo
 *
 * Era una banda `bg-accent-soft` con borde ambar y el nombre en mayusculas: una
 * alerta permanente para algo que no es una alerta, sino contexto. Ocupaba mas
 * atencion que los mensajes.
 *
 * Ahora es una linea sobre la superficie normal, con un filete vertical de
 * marca como unica senal. El ambar queda libre para lo que de verdad avisa.
 *
 * ## La rueda
 *
 * Con varios fijados no se apilan: se turnan. Todos se pintan en una columna
 * dentro de una ventana de un solo renglon con `overflow-hidden`, y lo que se
 * mueve es la columna entera. Asi el que sale sube y el que entra viene desde
 * abajo en el mismo gesto, que es lo que se ve como rueda.
 *
 * Se mueve la columna en vez de animar dos elementos sueltos a proposito: con
 * elementos sueltos habria que conservar el saliente durante la animacion y
 * borrarlo con un temporizador, y ese temporizador se desincroniza en cuanto se
 * avanza dos veces seguidas. Aqui no hay nada que sincronizar: la posicion es
 * el indice.
 *
 * La curva es `--ls-easing-magnet`, que se pasa apenas de largo antes de
 * asentarse. Es lo que da la sensacion de imantado.
 *
 * ## Que se detenga
 *
 * El turno se pausa al pasar por encima y al enfocar algo de dentro, y no
 * arranca si el sistema pide menos movimiento. WCAG 2.2.2 pide poder parar
 * cualquier cosa que se actualice sola: aqui no se puede leer un fijado con
 * calma si se va a ir solo mientras lo lees.
 *
 * `matchMedia` se lee en el componente y no en un hook: la frontera de capas
 * del proyecto prohibe tocar `window` fuera de la capa de componentes, pensando
 * en el port a React Native.
 */
export default function PinnedMessagesBanner({ pinned, canUnpin, onUnpin }: PinnedMessagesBannerProps) {
  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // El indice se acota durante el render, no desde un efecto. Con un efecto,
  // React pinta dos veces: una con el indice invalido y otra ya corregido.
  const indiceVisible = pinned.length === 0 || index >= pinned.length ? 0 : index;
  const hasMultiple = pinned.length > 1;

  useEffect(() => {
    if (!hasMultiple || pausado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const turno = window.setInterval(() => {
      setIndex((previo) => (previo + 1) % pinned.length);
    }, MS_ENTRE_FIJADOS);

    return () => window.clearInterval(turno);
  }, [hasMultiple, pausado, pinned.length]);

  if (pinned.length === 0) return null;

  const current = pinned[indiceVisible];
  if (!current) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-line bg-surface px-3"
      style={{ height: ALTO_FILA }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={(evento) => {
        // Solo se reanuda cuando el foco sale de verdad del bloque, no al saltar
        // de un boton al de al lado.
        if (!contenedorRef.current?.contains(evento.relatedTarget as Node | null)) {
          setPausado(false);
        }
      }}
      ref={contenedorRef}
    >
      <span className="shrink-0 text-ink-muted">
        <ChatIcon.Pin className="h-3 w-3" />
      </span>

      {/* La ventana: un solo renglon de alto, y lo que sobra queda fuera. */}
      <div className="min-w-0 flex-1 overflow-hidden" style={{ height: ALTO_FILA }}>
        <div
          className="transition-transform duration-500 ease-magnet"
          style={{ transform: `translateY(-${indiceVisible * ALTO_FILA}px)` }}
        >
          {pinned.map((fijado) => (
            <div
              key={fijado.message_id}
              className="flex items-center gap-1.5"
              style={{ height: ALTO_FILA }}
              // Los que no estan a la vista se ocultan del lector de pantalla:
              // si no, anunciaria los cinco fijados como si estuvieran todos.
              aria-hidden={fijado.message_id !== current.message_id}
            >
              {/* Filete de marca: la unica senal de color que queda. */}
              <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-primary" />
              <span className="shrink-0 truncate text-micro font-semibold text-ink-secondary">
                {fijado.message?.user_profile?.full_name || 'Usuario'}
              </span>
              <span className="min-w-0 flex-1 truncate text-meta text-ink-muted">
                {fijado.message ? toPlainText(fijado.message.content) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {hasMultiple && (
        <button
          type="button"
          onClick={() => setIndex((previo) => (previo + 1) % pinned.length)}
          title="Ver siguiente mensaje fijado"
          aria-label={`Ver siguiente mensaje fijado. ${indiceVisible + 1} de ${pinned.length}`}
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-micro tabular-nums text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {indiceVisible + 1}/{pinned.length}
        </button>
      )}

      {canUnpin && (
        <button
          type="button"
          onClick={() => onUnpin(current.message_id)}
          title="Desfijar este mensaje"
          aria-label="Desfijar este mensaje"
          className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <ChatIcon.Pin className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
