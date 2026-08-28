import { useMemo, type Dispatch, type SetStateAction } from 'react';
import ChatDaySeparator from './ChatDaySeparator';
import ChatMessageGroup from './ChatMessageGroup';
import { agruparMensajes } from '../../utils/chatMessageGrouping';
import { reportMessage } from '../../services/chatModerationService';
import type { ChatMessage, ChatReactionEmoji, ChatReactionSummary } from '../../types';
import type { Mention } from '../../types/mentions';
import type { ChatScroll } from '../../hooks/useChatScroll';
import type { useChatModeration } from '../../hooks/useChatModeration';
import type { useDirectMessageSessions } from '../../hooks/useDirectMessageSessions';

/**
 * Lista de mensajes de la sala.
 *
 * Media 362 lineas y pintaba la burbuja, el anuncio, las siete acciones y sus
 * tres menus dentro de un unico `.map()`. Ahora solo decide el orden: agrupa
 * con `agruparMensajes` -una funcion pura, con sus propios tests- y delega
 * cada racha en `ChatMessageGroup`.
 *
 * El contenedor conserva `scroll.containerRef` y `scroll.handleScroll` en el
 * div raiz a proposito: `useChatScroll` mide ESTE elemento, y bajarlos a un
 * hijo romperia su contrato y el test que lo cubre.
 *
 * `role="log"` con `aria-live="polite"` es lo que hace que un lector de
 * pantalla anuncie los mensajes que van llegando. Sin eso la sala era una
 * region muda: el mensaje aparecia y no se enteraba nadie.
 */
export interface ChatMessageListProps {
  visibleMessages: ChatMessage[];
  scroll: ChatScroll;
  userId?: string;
  isStaff: boolean;

  savedIds: Set<string>;
  highlights: ReturnType<typeof import('../../hooks/useHighlightedMessages').useHighlightedMessages>;

  reactionsByMessage: Map<string, ChatReactionSummary[]>;
  reactionsPending: Set<string>;
  onToggleReaction: (messageId: string, emoji: ChatReactionEmoji) => void;
  moderation: ReturnType<typeof useChatModeration>;
  dm: ReturnType<typeof useDirectMessageSessions>;

  /** `${messageId}:${more|pin|report}` del unico menu de mensaje abierto. */
  openMenuFor: string | null;
  setOpenMenuFor: Dispatch<SetStateAction<string | null>>;
  /** Id del mensaje cuyo menu de autor esta abierto. */
  authorMenuFor: string | null;
  setAuthorMenuFor: Dispatch<SetStateAction<string | null>>;

  /** Recibe el mensaje a citar; la sala ademas enfoca el campo de escritura. */
  setReplyTo: (message: ChatMessage) => void;
  setDeleteMessageTarget: Dispatch<SetStateAction<ChatMessage | null>>;
  setProfileUser: Dispatch<SetStateAction<{ id: string; label: string; avatarUrl?: string } | null>>;

  handleMentionClick: (mention: Mention) => void;
  handleToggleSaved: (message: ChatMessage) => void;
  handlePin: (messageId: string, hours: number) => void;
}

export default function ChatMessageList({
  visibleMessages,
  scroll,
  userId,
  isStaff,
  savedIds,
  highlights,
  reactionsByMessage,
  reactionsPending,
  onToggleReaction,
  moderation,
  dm,
  openMenuFor,
  setOpenMenuFor,
  authorMenuFor,
  setAuthorMenuFor,
  setReplyTo,
  setDeleteMessageTarget,
  setProfileUser,
  handleMentionClick,
  handleToggleSaved,
  handlePin,
}: ChatMessageListProps) {
  const dias = useMemo(() => agruparMensajes(visibleMessages), [visibleMessages]);

  return (
    <div
      ref={scroll.containerRef}
      onScroll={scroll.handleScroll}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Mensajes de la sala"
      className="relative flex-1 space-y-2 overflow-y-auto px-3 py-2"
    >
      {visibleMessages.length === 0 && (
        <p className="mt-10 text-center text-meta text-ink-muted">
          Todavía no hay mensajes. Empezá vos la conversación.
        </p>
      )}

      {dias.map((dia) => (
        <section key={dia.id} className="space-y-3">
          <ChatDaySeparator label={dia.etiqueta} />

          {dia.grupos.map((grupo) => {
            const autor = grupo.mensajes[0]?.user_profile;
            const nombre = autor?.full_name || 'Usuario';

            return (
              <ChatMessageGroup
                key={grupo.id}
                grupo={grupo}
                isOwn={!!userId && grupo.userId === userId}
                isStaff={isStaff}
                savedIds={savedIds}
                highlightedIds={highlights.myHighlightedIds}
                reactionsByMessage={reactionsByMessage}
                reactionsPending={reactionsPending}
                onToggleReaction={onToggleReaction}
                openMenuFor={openMenuFor}
                onOpenMenuFor={setOpenMenuFor}
                authorMenuOpen={authorMenuFor === grupo.id}
                onToggleAuthorMenu={() =>
                  setAuthorMenuFor((actual) => (actual === grupo.id ? null : grupo.id))
                }
                authorMenu={{
                  isMuted: moderation.mutedIds.has(grupo.userId),
                  isBlocked: moderation.blockedIds.has(grupo.userId),
                  onViewProfile: () => {
                    setProfileUser({ id: grupo.userId, label: nombre, avatarUrl: autor?.avatar_url });
                    setAuthorMenuFor(null);
                  },
                  onSendMessage: () => {
                    dm.openSession(grupo.userId, nombre, autor?.avatar_url);
                    setAuthorMenuFor(null);
                  },
                  onToggleMute: () => {
                    void moderation.toggleMute(grupo.userId, !moderation.mutedIds.has(grupo.userId));
                    setAuthorMenuFor(null);
                  },
                  onToggleBlock: () => {
                    void moderation.toggleBlock(grupo.userId, !moderation.blockedIds.has(grupo.userId));
                    setAuthorMenuFor(null);
                  },
                }}
                onReply={setReplyTo}
                onToggleSaved={handleToggleSaved}
                onToggleHighlight={(message) => void highlights.toggleHighlight(message)}
                onDelete={setDeleteMessageTarget}
                onPin={handlePin}
                onReport={(messageId, reason) => {
                  if (userId) void reportMessage(messageId, userId, reason);
                }}
                onMentionClick={handleMentionClick}
              />
            );
          })}
        </section>
      ))}

      <div ref={scroll.endRef} />
    </div>
  );
}
