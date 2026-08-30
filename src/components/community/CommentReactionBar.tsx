import { ChatIcon } from '../chat/ChatIcons';
import {
  COMMUNITY_REACTIONS,
  type CommunityReactionKind,
  type CommunityReactionSummary,
} from '../../types/community';

/**
 * REACCIONES DE UN COMENTARIO
 *
 * Mismo criterio que el chat: lo que se guarda es el caracter, porque es la
 * clave de la fila; lo que se dibuja son iconos del proyecto. Los emoticones
 * viven unicamente dentro del selector de emoticones.
 *
 * Es un componente aparte del de chat y no una generalizacion porque los tipos
 * son distintos (`ChatReactionKind` frente a `CommunityReactionKind`, cada uno
 * atado al CHECK de su tabla) y lo unico que compartirian es el JSX. Cuando
 * aparezca un tercer consumidor conviene extraer la primitiva; con dos, la
 * abstraccion costaria mas de lo que ahorra.
 */

const NOMBRE: Record<CommunityReactionKind, string> = {
  like: 'Me gusta',
  dislike: 'No me gusta',
  love: 'Me encanta',
};

const ICONO: Record<
  CommunityReactionKind,
  (props: { className?: string; filled?: boolean }) => JSX.Element
> = {
  like: ChatIcon.ThumbUp,
  dislike: ChatIcon.ThumbDown,
  love: ChatIcon.Heart,
};

/** Las reacciones ya puestas. El contador se oculta cuando vale 1. */
export default function CommentReactionBar({
  reactions,
  onToggle,
}: {
  reactions: CommunityReactionSummary[];
  onToggle: (reaction: CommunityReactionKind) => void;
}) {
  // Orden fijo: sin esto los chips bailan segun quien reaccione primero.
  const ordenadas = COMMUNITY_REACTIONS.map((reaction) =>
    reactions.find((r) => r.reaction === reaction)
  ).filter((r): r is CommunityReactionSummary => !!r && r.count > 0);

  if (ordenadas.length === 0) return null;

  return (
    <>
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
                ? `${NOMBRE[reaction.reaction]}, ${reaction.count}, incluida la tuya`
                : `${NOMBRE[reaction.reaction]}, ${reaction.count}`
            }
            className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-micro font-bold transition-colors ${
              reaction.reactedByMe
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink-secondary hover:bg-surface-hover'
            }`}
          >
            <Glifo className="h-3 w-3" filled={reaction.reactedByMe} />
            {reaction.count > 1 && reaction.count}
          </button>
        );
      })}
    </>
  );
}

/** El selector de tres, para desplegar desde la carita. */
export function CommentReactionPicker({
  reactions,
  onToggle,
}: {
  reactions: CommunityReactionSummary[];
  onToggle: (reaction: CommunityReactionKind) => void;
}) {
  return (
    <>
      {COMMUNITY_REACTIONS.map((reaction) => {
        const mia = reactions.find((r) => r.reaction === reaction)?.reactedByMe ?? false;
        const Glifo = ICONO[reaction];

        return (
          <button
            key={reaction}
            type="button"
            onClick={() => onToggle(reaction)}
            title={NOMBRE[reaction]}
            aria-label={`Reaccionar: ${NOMBRE[reaction]}`}
            aria-pressed={mia}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-hover ${
              mia ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Glifo className="h-3.5 w-3.5" filled={mia} />
          </button>
        );
      })}
    </>
  );
}
