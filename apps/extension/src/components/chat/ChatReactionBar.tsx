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
    /*
      UNA SOLA CAPSULA, NO UNA POR REACCION.
 
      Cada reaccion traia su borde, su fondo y su relleno: tres reacciones eran
      tres pildoras de 24px de alto que no cabian al costado de la burbuja, y
      con `flex-wrap` se apilaban una encima de otra. El envoltorio lleva ahora
      el borde y el fondo, y dentro van los iconos sueltos: tres ocupan unos
      52px en vez de 110, y caben en una sola linea.
 
      `flex-nowrap` es la parte que impide que vuelvan a apilarse. Sin ancho
      maximo: el grupo ya no crece lo suficiente como para necesitarlo.
    */
    <div
      className={`inline-flex h-5 shrink-0 flex-nowrap items-center gap-0.5 rounded-full border border-line bg-surface px-1 ${
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
            // La propia se distingue por el color del glifo y porque va
            // relleno; no necesita fondo propio dentro de la capsula.
            className={`inline-flex h-4 items-center gap-0.5 rounded-full px-0.5 text-micro font-bold leading-none transition-colors ${
              reaction.reactedByMe ? 'text-primary' : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <Glifo className="h-3 w-3" filled={reaction.reactedByMe} />
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
