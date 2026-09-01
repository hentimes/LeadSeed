import { ChatIcon } from './ChatIcons';
import { CHAT_REACTIONS, type ChatReactionKind, type ChatReactionSummary } from '../../types';

/**
 * REACCIONES
 *
 * Lo que se guarda en la base es un identificador (`like`, `dislike`, `love`),
 * nunca el caracter: ver la migracion 136. Lo que se DIBUJA son iconos de trazo
 * del mismo juego que el resto del chat.
 *
 * La distincion es una regla del producto, no una preferencia: los emoticones
 * viven unicamente dentro del selector de emoticones. Un emoticon suelto en la
 * interfaz se dibuja con la fuente del sistema, asi que cambia de aspecto entre
 * Windows, Mac y Linux, no hereda el color del tema y no se puede alinear con
 * los demas iconos.
 */

/** Nombre de cada reaccion para el lector de pantalla y el tooltip. */
export const NOMBRE_DE_REACCION: Record<ChatReactionKind, string> = {
  like: 'Me gusta',
  dislike: 'No me gusta',
  love: 'Me encanta',
};

const ICONO: Record<ChatReactionKind, (props: { className?: string; filled?: boolean }) => JSX.Element> = {
  like: ChatIcon.ThumbUp,
  dislike: ChatIcon.ThumbDown,
  love: ChatIcon.Heart,
};

/**
 * REACCIONES YA PUESTAS, debajo de la burbuja.
 *
 * Van FUERA de la burbuja y no dentro. Dentro no funciona: la burbuja propia es
 * morada solida, y un chip claro encima parte el bloque en dos. Solapado
 * tampoco: chocaria con las esquinas apretadas de los mensajes agrupados y con
 * la estrella de destacado, que ya vive en la esquina inferior.
 *
 * El contador se oculta cuando vale 1. Un "1" al lado de cada icono es ruido
 * repetido en una columna de 320px, y su ausencia ya significa "uno".
 */
export function ChatReactionBar({
  reactions,
  pending,
  onToggle,
}: {
  reactions: ChatReactionSummary[];
  /** Hay un cambio viajando al servidor: se atenua hasta confirmar. */
  pending: boolean;
  onToggle: (reaction: ChatReactionKind) => void;
}) {
  // Orden fijo, el mismo que el selector: sin esto los chips bailan de sitio
  // segun quien reaccione primero.
  const ordenadas = CHAT_REACTIONS.map((reaction) =>
    reactions.find((r) => r.reaction === reaction)
  ).filter((r): r is ChatReactionSummary => !!r && r.count > 0);

  if (ordenadas.length === 0) return null;

  return (
    // `max-w-[45%]` y `flex-wrap`: al costado de la burbuja las pildoras le
    // quitan ancho, y con tres reacciones distintas en un panel de 320px la
    // burbuja se quedaba sin sitio. Pasado ese tope se apilan.
    <div
      className={`flex max-w-[45%] shrink-0 flex-wrap items-end gap-1 ${
        pending ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      {ordenadas.map((reaction) => {
        const Glifo = ICONO[reaction.reaction];

        return (
          <button
            key={reaction.reaction}
            type="button"
            onClick={() => onToggle(reaction.reaction)}
            aria-pressed={reaction.reactedByMe}
            aria-label={
              reaction.reactedByMe
                ? `${NOMBRE_DE_REACCION[reaction.reaction]}, ${reaction.count}, incluida la tuya`
                : `${NOMBRE_DE_REACCION[reaction.reaction]}, ${reaction.count}`
            }
            className={`inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-micro font-bold transition-colors ${
              reaction.reactedByMe
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink-secondary hover:bg-surface-hover'
            }`}
          >
            <Glifo className="h-3.5 w-3.5" filled={reaction.reactedByMe} />
            {reaction.count > 1 && reaction.count}
          </button>
        );
      })}
    </div>
  );
}

/**
 * SELECTOR de reaccion, dentro de la pildora de acciones del mensaje.
 *
 * Los tres van en linea y no detras de un sub-menu: con una lista cerrada de
 * tres, un desplegable agrega un toque, un punto de anclaje mas que puede
 * desbordar el panel y una capa de foco, todo para ahorrar unos 80px que de
 * hecho entran.
 */
export function ChatReactionPicker({
  reactions,
  onToggle,
}: {
  reactions: ChatReactionSummary[];
  onToggle: (reaction: ChatReactionKind) => void;
}) {
  return (
    <>
      {CHAT_REACTIONS.map((reaction) => {
        const mia = reactions.find((r) => r.reaction === reaction)?.reactedByMe ?? false;
        const Glifo = ICONO[reaction];

        return (
          <button
            key={reaction}
            type="button"
            onClick={() => onToggle(reaction)}
            title={NOMBRE_DE_REACCION[reaction]}
            aria-label={`Reaccionar: ${NOMBRE_DE_REACCION[reaction]}`}
            aria-pressed={mia}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-hover ${
              mia ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Glifo className="h-[17px] w-[17px]" filled={mia} />
          </button>
        );
      })}

      <span className="mx-0.5 h-4 w-px shrink-0 bg-line-soft" aria-hidden="true" />
    </>
  );
}
