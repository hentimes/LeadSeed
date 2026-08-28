import { ChatIcon } from '../chat/ChatIcons';
import {
  COMMUNITY_REACTION_EMOJIS,
  type CommunityReactionEmoji,
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
 * son distintos (`ChatReactionEmoji` frente a `CommunityReactionEmoji`, cada uno
 * atado al CHECK de su tabla) y lo unico que compartirian es el JSX. Cuando
 * aparezca un tercer consumidor conviene extraer la primitiva; con dos, la
 * abstraccion costaria mas de lo que ahorra.
 */

const NOMBRE: Record<CommunityReactionEmoji, string> = {
  '👍': 'Me gusta',
  '👎': 'No me gusta',
  '❤️': 'Me encanta',
};

const ICONO: Record<
  CommunityReactionEmoji,
  (props: { className?: string; filled?: boolean }) => JSX.Element
> = {
  '👍': ChatIcon.ThumbUp,
  '👎': ChatIcon.ThumbDown,
  '❤️': ChatIcon.Heart,
};

/** Las reacciones ya puestas. El contador se oculta cuando vale 1. */
export default function CommentReactionBar({
  reactions,
  onToggle,
}: {
  reactions: CommunityReactionSummary[];
  onToggle: (emoji: CommunityReactionEmoji) => void;
}) {
  // Orden fijo: sin esto los chips bailan segun quien reaccione primero.
  const ordenadas = COMMUNITY_REACTION_EMOJIS.map((emoji) =>
    reactions.find((r) => r.emoji === emoji)
  ).filter((r): r is CommunityReactionSummary => !!r && r.count > 0);

  if (ordenadas.length === 0) return null;

  return (
    <>
      {ordenadas.map((reaction) => {
        const Glifo = ICONO[reaction.emoji];

        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onToggle(reaction.emoji)}
            aria-pressed={reaction.reactedByMe}
            aria-label={
              reaction.reactedByMe
                ? `${NOMBRE[reaction.emoji]}, ${reaction.count}, incluida la tuya`
                : `${NOMBRE[reaction.emoji]}, ${reaction.count}`
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
  onToggle: (emoji: CommunityReactionEmoji) => void;
}) {
  return (
    <>
      {COMMUNITY_REACTION_EMOJIS.map((emoji) => {
        const mia = reactions.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
        const Glifo = ICONO[emoji];

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            title={NOMBRE[emoji]}
            aria-label={`Reaccionar: ${NOMBRE[emoji]}`}
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
