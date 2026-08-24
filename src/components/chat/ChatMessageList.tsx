import type { Dispatch, SetStateAction } from 'react';
import { Icon } from '../../utils/icons';
import MessageContent from './MessageContent';
import MessageAttachment from './MessageAttachment';
import MessageAuthorMenu from './MessageAuthorMenu';
import PinDurationMenu from './PinDurationMenu';
import ReportMessageMenu from './ReportMessageMenu';
import { toPlainText } from '../../utils/mentionParser';
import { reportMessage } from '../../services/chatModerationService';
import type { ChatMessage } from '../../types';
import type { Mention } from '../../types/mentions';
import type { ChatScroll } from '../../hooks/useChatScroll';
import type { useChatModeration } from '../../hooks/useChatModeration';
import type { useDirectMessageSessions } from '../../hooks/useDirectMessageSessions';
import { avatarUrl } from '../../utils/avatar';
import { formatearHora } from '../../utils/date';

/**
 * Lista de mensajes de la sala, con sus menus por mensaje.
 *
 * Extraido de `ChatRoom.tsx` como parte del bloque 6, y es el bloque mas grande
 * que quedaba: 274 lineas de JSX. Extraccion presentacional pura, sin mover
 * logica ni estado; el typecheck verifica que no falte ninguna referencia.
 *
 * Cada mensaje puede abrir tres menus distintos (fijar, reportar, autor), y por
 * eso llegan los tres `*MenuFor` con su setter: el estado de "que menu esta
 * abierto y sobre cual mensaje" vive en la sala, no aqui, porque abrir uno debe
 * cerrar los demas.
 */
export interface ChatMessageListProps {
  visibleMessages: ChatMessage[];
  scroll: ChatScroll;
  userId?: string;
  isStaff: boolean;

  savedIds: Set<string>;
  highlights: ReturnType<typeof import('../../hooks/useHighlightedMessages').useHighlightedMessages>;
  moderation: ReturnType<typeof useChatModeration>;
  dm: ReturnType<typeof useDirectMessageSessions>;

  pinMenuFor: string | null;
  setPinMenuFor: Dispatch<SetStateAction<string | null>>;
  reportMenuFor: string | null;
  setReportMenuFor: Dispatch<SetStateAction<string | null>>;
  authorMenuFor: string | null;
  setAuthorMenuFor: Dispatch<SetStateAction<string | null>>;

  setReplyTo: Dispatch<SetStateAction<ChatMessage | null>>;
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
  moderation,
  dm,
  pinMenuFor,
  setPinMenuFor,
  reportMenuFor,
  setReportMenuFor,
  authorMenuFor,
  setAuthorMenuFor,
  setReplyTo,
  setDeleteMessageTarget,
  setProfileUser,
  handleMentionClick,
  handleToggleSaved,
  handlePin,
}: ChatMessageListProps) {
  const user = userId ? { id: userId } : null;

  return (
  <div
    ref={scroll.containerRef}
    onScroll={scroll.handleScroll}
    className="flex-1 overflow-y-auto p-4 space-y-4 relative"
  >
    {visibleMessages.length === 0 && (
      <div className="text-center text-sm text-ink-muted mt-10">
        No hay mensajes nuevos. Sé el primero en escribir.
      </div>
    )}

    {visibleMessages.map((msg) => {
      const isOwn = user && msg.user_id === user.id;

      if (msg.is_announcement) {
        return (
          <div
            key={msg.id}
            className="flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5"
          >
            <span className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
              </svg>
            </span>

            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Anuncio de {msg.user_profile?.full_name || 'Usuario'}
              </span>
              <p className="text-sm text-ink dark:text-gray-100 break-words whitespace-pre-wrap">
                <MessageContent content={msg.content} onMentionClick={handleMentionClick} />
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleToggleSaved(msg)}
              className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                savedIds.has(msg.id) ? 'text-primary' : 'text-amber-500 hover:text-primary'
              }`}
              title={savedIds.has(msg.id) ? 'Quitar de guardados' : 'Guardar mensaje'}
            >
              <svg className="w-4 h-4" fill={savedIds.has(msg.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
              </svg>
            </button>
          </div>
        );
      }

      return (
        <div key={msg.id} className={`relative flex gap-2 group items-start ${isOwn ? 'flex-row-reverse' : ''}`}>
          {!isOwn && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setAuthorMenuFor(authorMenuFor === msg.id ? null : msg.id)}
                className="flex-shrink-0"
                title={msg.user_profile?.full_name || 'Usuario'}
              >
                <img
                  src={avatarUrl(msg.user_profile?.full_name, msg.user_profile?.avatar_url)}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm transition-transform hover:scale-105"
                />
              </button>

              {authorMenuFor === msg.id && (
                <MessageAuthorMenu
                  isMuted={moderation.mutedIds.has(msg.user_id)}
                  isBlocked={moderation.blockedIds.has(msg.user_id)}
                  onClose={() => setAuthorMenuFor(null)}
                  onViewProfile={() => {
                    setProfileUser({
                      id: msg.user_id,
                      label: msg.user_profile?.full_name || 'Usuario',
                      avatarUrl: msg.user_profile?.avatar_url,
                    });
                    setAuthorMenuFor(null);
                  }}
                  onSendMessage={() => {
                    dm.openSession(
                      msg.user_id,
                      msg.user_profile?.full_name || 'Usuario',
                      msg.user_profile?.avatar_url
                    );
                    setAuthorMenuFor(null);
                  }}
                  onToggleMute={() => {
                    void moderation.toggleMute(msg.user_id, !moderation.mutedIds.has(msg.user_id));
                    setAuthorMenuFor(null);
                  }}
                  onToggleBlock={() => {
                    void moderation.toggleBlock(msg.user_id, !moderation.blockedIds.has(msg.user_id));
                    setAuthorMenuFor(null);
                  }}
                />
              )}
            </div>
          )}

          <div className={`flex flex-col min-w-0 max-w-[85%] ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isOwn && (
              <div className="mb-1 flex h-8 min-w-0 max-w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthorMenuFor(authorMenuFor === msg.id ? null : msg.id)}
                  className="truncate font-medium text-sm text-ink dark:text-gray-200 hover:text-primary transition-colors"
                >
                  {msg.user_profile?.full_name || 'Usuario'}
                </button>
                <span className="shrink-0 text-[10px] text-ink-muted font-medium">
                  {formatearHora(msg.created_at)}
                </span>
              </div>
            )}

            <div className={`relative min-w-0 max-w-full px-4 py-2.5 text-[13px] sm:text-sm break-words [overflow-wrap:anywhere] shadow-sm
              ${isOwn 
                ? 'bg-primary-soft text-ink rounded-2xl rounded-tr-sm' 
                : 'bg-surface text-ink rounded-2xl rounded-tl-sm border border-line dark:border-gray-700'
              }`}
            >
              {/* Reply Quote */}
              {msg.reply_to_message && (
                <div className={`mb-2 pl-2 border-l-2 text-xs py-1 pr-2 rounded-r flex flex-col
                  ${isOwn 
                    ? 'border-primary bg-surface/50 text-ink-secondary' 
                    : 'border-blue-400 bg-surface-muted text-ink-muted'
                  }`}
                >
                  <span className="font-semibold text-[10px]">
                    {msg.reply_to_message.user_profile?.full_name || 'Usuario'}
                  </span>
                  <span className="truncate opacity-80">
                    {toPlainText(msg.reply_to_message.content)}
                  </span>
                </div>
              )}

              {msg.deleted_at ? (
                <p className="flex items-center gap-1.5 text-ink-muted italic text-[13px] sm:text-sm">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {msg.content}
                </p>
              ) : (
                <>
                  {msg.content && (
                    <MessageContent content={msg.content} onMentionClick={handleMentionClick} />
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                      {msg.attachments.map((attachment) => (
                        <MessageAttachment key={attachment.id} attachment={attachment} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {isOwn && (
                <span className="absolute -bottom-5 right-1 text-[10px] text-ink-muted font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatearHora(msg.created_at)}
                  <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
            </div>
          </div>
          
          {/* Acciones del mensaje: un mensaje ya eliminado no tiene mas
              nada que hacerle -- guardarlo, destacarlo o responderle a un
              aviso vacio no tiene sentido.

              Flotan sobre la esquina en vez de ocupar sitio en la fila: cinco
              botones son unos 140px que la fila reservaba aunque estuvieran
              invisibles, y en un panel de 320px eso se lo quitaba a la
              burbuja, que acababa partiendo el texto a una letra por linea. */}
          {!msg.deleted_at && (
          <div className={`absolute top-0 z-10 flex items-center rounded-full border border-line bg-surface/95 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-gray-700 ${isOwn ? 'left-0' : 'right-0'}`}>
            <button
              onClick={() => void handleToggleSaved(msg)}
              className={`p-1.5 rounded-full hover:bg-surface-hover transition-colors ${
                savedIds.has(msg.id) ? 'text-primary' : 'text-ink-muted hover:text-primary'
              }`}
              title={savedIds.has(msg.id) ? 'Quitar de guardados' : 'Guardar mensaje'}
            >
              <svg className="w-4 h-4" fill={savedIds.has(msg.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
              </svg>
            </button>

            <button
              onClick={() => void highlights.toggleHighlight(msg)}
              className={`p-1.5 rounded-full hover:bg-surface-hover transition-colors ${
                highlights.myHighlightedIds.has(msg.id) ? 'text-amber-500' : 'text-ink-muted hover:text-amber-500'
              }`}
              title={highlights.myHighlightedIds.has(msg.id) ? 'Quitar destacado' : 'Destacar mensaje'}
            >
              <svg className="w-4 h-4" fill={highlights.myHighlightedIds.has(msg.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.98 21.539a.562.562 0 01-.84-.61l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>

            {isStaff && (
              <button
                onClick={() => setPinMenuFor(pinMenuFor === msg.id ? null : msg.id)}
                className="p-1.5 text-ink-muted hover:text-amber-600 hover:bg-surface-hover rounded-full transition-colors"
                title="Fijar mensaje"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 3a1 1 0 011 1v5.586l3.707 3.707a1 1 0 01-.707 1.707H13v5a1 1 0 01-2 0v-5H4.586a1 1 0 01-.293-1.707L8 9.586V4a1 1 0 011-1z" />
                </svg>
              </button>
            )}

            {pinMenuFor === msg.id && user && (
              <PinDurationMenu
                align={isOwn ? 'left' : 'right'}
                onClose={() => setPinMenuFor(null)}
                onSelect={(hours) => {
                  void handlePin(msg.id, hours);
                  setPinMenuFor(null);
                }}
              />
            )}

            {!isOwn && (
              <button
                onClick={() => setReportMenuFor(reportMenuFor === msg.id ? null : msg.id)}
                className="p-1.5 text-ink-muted hover:text-state-danger hover:bg-surface-hover rounded-full transition-colors"
                title="Reportar mensaje"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M4.5 4.5h13l-3 4.5 3 4.5h-13" />
                </svg>
              </button>
            )}

            {reportMenuFor === msg.id && user && (
              <ReportMessageMenu
                align={isOwn ? 'left' : 'right'}
                onClose={() => setReportMenuFor(null)}
                onSubmit={(reason) => {
                  void reportMessage(msg.id, user.id, reason);
                  setReportMenuFor(null);
                }}
              />
            )}

            <button
              onClick={() => setReplyTo(msg)}
              className="p-1.5 text-ink-muted hover:text-primary hover:bg-surface-hover rounded-full transition-colors"
              title="Responder"
            >
              <Icon.Reply />
            </button>

            {isStaff && (
              <button
                onClick={() => setDeleteMessageTarget(msg)}
                className="p-1.5 text-ink-muted hover:text-state-danger hover:bg-surface-hover rounded-full transition-colors"
                title="Eliminar mensaje"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          )}
        </div>
      );
    })}
    <div ref={scroll.endRef} />
  </div>
  );
}
