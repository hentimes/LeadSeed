import { Avatar } from '../../design';
import ChatMessageBubble from './ChatMessageBubble';
import ChatAnnouncementMessage from './ChatAnnouncementMessage';
import ChatSystemMessage from './ChatSystemMessage';
import MessageAuthorMenu from './MessageAuthorMenu';
import { ChatIcon } from './ChatIcons';
import { formatearHora } from '../../utils/date';
import type { ChatMessage, ChatReactionEmoji, ChatReactionSummary } from '../../types';
import type { Mention } from '../../types/mentions';
import type { GrupoDeAutor } from '../../utils/chatMessageGrouping';

/**
 * UNA RACHA DEL MISMO AUTOR
 *
 * El avatar, el nombre y la hora se pintan UNA vez por racha, no una por
 * mensaje. Antes cada mensaje repetia los tres, asi que diez mensajes seguidos
 * de la misma persona gastaban ~80px solo en volver a decir quien era.
 *
 * La hora va debajo de la ultima burbuja y siempre visible. Antes la del
 * mensaje propio estaba en `opacity-0 group-hover:opacity-100`: un dato basico
 * escondido detras del raton, invisible en pantalla tactil.
 */

export interface ChatMessageGroupProps {
  grupo: GrupoDeAutor;
  isOwn: boolean;
  isStaff: boolean;

  savedIds: Set<string>;
  highlightedIds: Set<string>;

  reactionsByMessage: Map<string, ChatReactionSummary[]>;
  reactionsPending: Set<string>;
  onToggleReaction: (messageId: string, emoji: ChatReactionEmoji) => void;

  /** `${messageId}:${menu}` del unico menu abierto en toda la sala. */
  openMenuFor: string | null;
  onOpenMenuFor: (value: string | null) => void;

  authorMenuOpen: boolean;
  onToggleAuthorMenu: () => void;
  authorMenu: {
    isMuted: boolean;
    isBlocked: boolean;
    onViewProfile: () => void;
    onSendMessage: () => void;
    onToggleMute: () => void;
    onToggleBlock: () => void;
  };

  onReply: (message: ChatMessage) => void;
  onToggleSaved: (message: ChatMessage) => void;
  onToggleHighlight: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onPin: (messageId: string, hours: number) => void;
  onReport: (messageId: string, reason: string) => void;
  onMentionClick: (mention: Mention) => void;
}

export default function ChatMessageGroup({
  grupo,
  isOwn,
  isStaff,
  savedIds,
  highlightedIds,
  reactionsByMessage,
  reactionsPending,
  onToggleReaction,
  openMenuFor,
  onOpenMenuFor,
  authorMenuOpen,
  onToggleAuthorMenu,
  authorMenu,
  onReply,
  onToggleSaved,
  onToggleHighlight,
  onDelete,
  onPin,
  onReport,
  onMentionClick,
}: ChatMessageGroupProps) {
  const primero = grupo.mensajes[0];
  const ultimo = grupo.mensajes[grupo.mensajes.length - 1];

  // `agruparMensajes` nunca crea un grupo vacio, pero el tipo del indice no lo
  // sabe y no vale la pena forzarlo con un `!`.
  if (!primero || !ultimo) return null;

  const autor = primero.user_profile?.full_name || 'Usuario';

  // Un aviso del sistema (pausa, reanudacion) es una linea centrada: ni
  // avatar, ni nombre, ni marco.
  if (primero.is_system) {
    return <ChatSystemMessage message={primero} />;
  }

  // Un anuncio del staff ocupa el ancho completo y trae su propio marco: no
  // lleva ni avatar ni columna.
  if (primero.is_announcement) {
    return (
      <ChatAnnouncementMessage
        message={primero}
        isSaved={savedIds.has(primero.id)}
        onToggleSaved={() => onToggleSaved(primero)}
        onMentionClick={onMentionClick}
      />
    );
  }

  return (
    <div className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleAuthorMenu}
            aria-label={`Acciones sobre ${autor}`}
            aria-expanded={authorMenuOpen}
            title={autor}
            className="rounded-full transition-transform hover:scale-105"
          >
            <Avatar name={autor} src={primero.user_profile?.avatar_url} size="lg" ring="surface" />
          </button>

          {authorMenuOpen && <MessageAuthorMenu {...authorMenu} onClose={onToggleAuthorMenu} />}
        </div>
      )}

      {/*
        `max-w-[85%]` va AQUI, en la columna, y no en cada burbuja.

        Estuvo un rato en la burbuja como `max-w-[92%]` y rompia el layout: un
        porcentaje se resuelve contra el contenedor, y el contenedor era un
        `flex` que a su vez se ajustaba al contenido. Esa dependencia circular
        la resuelve cada navegador como puede, y el resultado medible fue que
        "hola" se partia en "hol" / "a".
      */}
      {/*
        `min(85%, 100%-2rem)`: la carita vive fuera de la burbuja, hacia el
        centro, y necesita 32px libres (28 del boton mas 4 de separacion).

        Con solo el 85%, a 320px quedaban 31,2px: faltaban 0,8. El `min` deja el
        85% donde sobra sitio -de `panel-sm` en adelante no cambia nada- y
        garantiza los 32px en el panel mas angosto, que es el unico caso donde
        el porcentaje no alcanzaba.
      */}
      <div
        className={`flex min-w-0 max-w-[min(85%,calc(100%-2rem))] flex-col gap-0.5 ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {!isOwn && (
          <button
            type="button"
            onClick={onToggleAuthorMenu}
            className="max-w-full truncate px-1 text-meta font-semibold text-ink transition-colors hover:text-primary"
          >
            {autor}
          </button>
        )}

        {grupo.mensajes.map((message, indice) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            isStaff={isStaff}
            posicion={{ primera: indice === 0, ultima: indice === grupo.mensajes.length - 1 }}
            isSaved={savedIds.has(message.id)}
            isHighlighted={highlightedIds.has(message.id)}
            reactions={reactionsByMessage.get(message.id) ?? []}
            reactionPending={reactionsPending.has(message.id)}
            onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
            openMenu={
              openMenuFor?.startsWith(`${message.id}:`)
                ? (openMenuFor.split(':')[1] as 'reactions' | 'more' | 'pin' | 'report')
                : null
            }
            onOpenMenu={(menu) => onOpenMenuFor(menu ? `${message.id}:${menu}` : null)}
            onReply={() => onReply(message)}
            onToggleSaved={() => onToggleSaved(message)}
            onToggleHighlight={() => onToggleHighlight(message)}
            onDelete={() => onDelete(message)}
            onPin={(hours) => onPin(message.id, hours)}
            onReport={(reason) => onReport(message.id, reason)}
            onMentionClick={onMentionClick}
          />
        ))}

        <span className="flex items-center gap-1 px-1 text-micro font-medium text-ink-muted">
          {formatearHora(ultimo.created_at)}
          {isOwn && !ultimo.deleted_at && (
            <ChatIcon.Check className="h-3 w-3" />
          )}
        </span>
      </div>
    </div>
  );
}
