import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineDirectory } from '../../hooks/useOnlineDirectory';
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete';
import { usePostMentionSuggestions } from '../../hooks/usePostMentionSuggestions';
import { toPlainText } from '../../utils/mentionParser';
import type { Mention } from '../../types/mentions';
import type { ChatMessage } from '../../types';
import { Icon } from '../../utils/icons';
import ChatTabs, { type ChatTab } from './ChatTabs';
import SavedMessagesPanel from './SavedMessagesPanel';
import PinnedMessagesBanner from './PinnedMessagesBanner';
import PinDurationMenu from './PinDurationMenu';
import MentionAutocomplete from './MentionAutocomplete';
import MessageContent from './MessageContent';
import EmojiPicker from './EmojiPicker';
import DirectMessageWindow from './DirectMessageWindow';
import PublicProfileModal from '../profile/PublicProfileModal';
import ConfirmAnnouncementModal from './ConfirmAnnouncementModal';
import { useMessageGuard } from '../../hooks/useMessageGuard';
import { useSavedMessages } from '../../hooks/useSavedMessages';
import { usePinnedMessages } from '../../hooks/usePinnedMessages';
import { useDirectMessageSessions, type DmSession } from '../../hooks/useDirectMessageSessions';
import { useChatModeration } from '../../hooks/useChatModeration';
import { useReportedMessages } from '../../hooks/useReportedMessages';
import { reportMessage } from '../../services/chatModerationService';
import ReportedMessagesPanel from './ReportedMessagesPanel';
import ReportMessageMenu from './ReportMessageMenu';
import { useChatBanStatus } from '../../hooks/useChatBanStatus';
import { banUser } from '../../services/chatModerationService';
import ChatBannedScreen from './ChatBannedScreen';
import BanUserMenu from './BanUserMenu';
import { useHighlightedMessages } from '../../hooks/useHighlightedMessages';
import MessageAuthorMenu from './MessageAuthorMenu';
import RoomInfoModal from './RoomInfoModal';
import type { ChatRoom as ChatRoomType } from '../../types';
import { attachFileToMessage, validateAttachmentSize } from '../../services/chatAttachmentsService';
import MessageAttachment from './MessageAttachment';
import FreezeDurationMenu from './FreezeDurationMenu';
import ConfirmDangerModal from './ConfirmDangerModal';
import ChatFrozenBanner from './ChatFrozenBanner';
import {
  MAX_CHAT_MESSAGE_DISPLAY_LENGTH as MAX_LENGTH,
  cleanChatRoomMessages,
  freezeChatRoom,
  markChatRoomRead,
  purgeChatRoomMessages,
  unfreezeChatRoom,
} from '../../services/chatService';
import { getErrorMessage } from '../../utils/errorMessage';

interface ChatRoomProps {
  roomId?: string; // Si es undefined, carga "General"
  onMentionClick?: (mention: Mention) => void;
}

export default function ChatRoom({ roomId, onMentionClick }: ChatRoomProps) {
  const { user, profile } = useAuth();
  const isStaff = profile?.role === 'admin' || !!profile?.is_helper;
  const { room, messages, loading, sendMessage, attachToMessage } = useChat(roomId);
  const { count: onlineCount } = useOnlineDirectory();
  const { savedIds, savedMessages, toggleSaved } = useSavedMessages();
  const { pinned, pin, unpin } = usePinnedMessages(room?.id);
  const highlights = useHighlightedMessages(room?.id);
  const [roomInfoOpen, setRoomInfoOpen] = useState(false);
  const [roomOverride, setRoomOverride] = useState<ChatRoomType | null>(null);
  const moderation = useChatModeration();
  const reportedMessages = useReportedMessages(isStaff);
  const [reportMenuFor, setReportMenuFor] = useState<string | null>(null);
  const { ban: myBan, loading: banLoading } = useChatBanStatus();
  const [banTarget, setBanTarget] = useState<{ id: string; label: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ChatTab>('messages');
  const [memberSearch, setMemberSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [profileUser, setProfileUser] = useState<{ id: string; label: string; avatarUrl?: string } | null>(null);
  const dm = useDirectMessageSessions(user?.id);
  const [pinMenuFor, setPinMenuFor] = useState<string | null>(null);
  const [authorMenuFor, setAuthorMenuFor] = useState<string | null>(null);
  const guard = useMessageGuard();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // El termino viaja por estado porque las sugerencias de publicaciones se
  // piden al servidor y alimentan de vuelta al mismo autocompletado.
  const [mentionTerm, setMentionTerm] = useState('');
  const postSuggestions = usePostMentionSuggestions(mentionTerm);

  const mentions = useMentionAutocomplete({
    text: inputText,
    excludeUserId: user?.id,
    extraSuggestions: postSuggestions,
    onTextChange: (text, cursor) => {
      setInputText(text);
      // El cursor debe reposicionarse despues de que React pinte el valor nuevo.
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursor, cursor);
      });
    },
  });

  useEffect(() => {
    setMentionTerm(mentions.term);
  }, [mentions.term]);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-scroll y lógica de "mensajes no leídos"
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Marca la sala como leida al abrirla y con cada mensaje visto, para que el
  // indicador del menu de navegacion no quede encendido.
  useEffect(() => {
    if (!room || !user) return;
    void markChatRoomRead(room.id, user.id);
  }, [room?.id, user?.id, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  // Una mencion de usuario abre la pestana de integrantes filtrada por esa
  // persona; las de publicacion las resuelve quien monta el chat.
  const handleMentionClick = (mention: Mention) => {
    if (mention.kind === 'user') {
      setProfileUser({ id: mention.id, label: mention.label });
      return;
    }

    onMentionClick?.(mention);
  };

  const [sendError, setSendError] = useState('');

  // El unico gatillo para anunciar es escribir "@todos" al principio del
  // mensaje. No es una mencion real (no apunta a ningun id): es una palabra
  // clave que activa el modo, y por eso se quita del texto antes de guardarlo
  // -- lo que ve el resto de la gente es el mensaje sin ese prefijo.
  const ANNOUNCEMENT_TRIGGER = /^@todos\b/i;
  const isAnnouncementDraft = isStaff && ANNOUNCEMENT_TRIGGER.test(inputText.trimStart());
  const stripAnnouncementTrigger = (text: string) =>
    text.replace(ANNOUNCEMENT_TRIGGER, '').trim();

  // @silenciar, @limpiar y @purgar son comandos, no mensajes: no se mandan al
  // chat, disparan una accion de moderacion de sala. @silenciar admite texto
  // despues (por si en el futuro se agrega motivo); los otros dos van solos.
  const FREEZE_TRIGGER = /^@silenciar\b/i;
  const isFreezeDraft = isStaff && FREEZE_TRIGGER.test(inputText.trimStart());
  const isCleanCommand = isStaff && inputText.trim().toLowerCase() === '@limpiar';
  const isPurgeCommand = isStaff && inputText.trim().toLowerCase() === '@purgar';

  const isRoomFrozen = !!room?.frozen_until && new Date(room.frozen_until) > new Date();

  const [freezeMenuOpen, setFreezeMenuOpen] = useState(false);
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState('');

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;

    const sizeError = validateAttachmentSize(file);
    if (sizeError) {
      setSendError(sizeError);
      return;
    }

    setSendError('');
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  // Se libera el object URL de la previsualizacion tambien al desmontar,
  // no solo al reemplazarla, para no dejar memoria colgada.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const performSend = async (content: string, asAnnouncement: boolean) => {
    const finalContent = asAnnouncement ? stripAnnouncementTrigger(content) : content;
    const fileToSend = pendingFile;

    try {
      const messageId = await sendMessage(mentions.serialize(finalContent), replyTo?.id, asAnnouncement);
      guard.confirmSent(content || (fileToSend ? `📎 ${fileToSend.name}:${fileToSend.size}` : ''));
      setInputText('');
      setReplyTo(null);
      setSendError('');
      mentions.reset();
      clearPendingFile();
      // Forzar scroll al fondo después de enviar
      setTimeout(scrollToBottom, 100);

      if (fileToSend && messageId && room && user) {
        setUploadingAttachment(true);
        try {
          const attachment = await attachFileToMessage(messageId, room.id, user.id, fileToSend);
          attachToMessage(messageId, attachment);
        } catch (err) {
          console.error('Error subiendo archivo', err);
          setSendError('El mensaje se envió, pero no se pudo subir el archivo adjunto.');
        } finally {
          setUploadingAttachment(false);
        }
      }
    } catch (err) {
      console.error('Error enviando mensaje', err);
      // Antes este error solo quedaba en consola: el usuario veia el boton
      // "no hacer nada" sin ninguna pista de que el envio habia fallado.
      setSendError(
        err instanceof Error ? err.message : 'No se pudo enviar el mensaje. Intentá de nuevo.'
      );
    }
  };

  const [confirmingAnnouncement, setConfirmingAnnouncement] = useState(false);
  const [actionError, setActionError] = useState('');

  // toggleSaved/pin lanzan si la escritura en la base falla (por ejemplo, si
  // el perfil no tiene permiso de staff para fijar). Antes ese fallo quedaba
  // como una promesa rechazada sin manejar: el boton no hacia nada visible.
  const handleToggleSaved = async (message: ChatMessage) => {
    try {
      await toggleSaved(message);
    } catch (err) {
      console.error('Error guardando mensaje', err);
      setActionError(err instanceof Error ? err.message : 'No se pudo guardar el mensaje.');
    }
  };

  const handlePin = async (messageId: string, hours: number) => {
    if (!user) return;
    try {
      await pin(messageId, user.id, hours);
    } catch (err) {
      console.error('Error fijando mensaje', err);
      setActionError(err instanceof Error ? err.message : 'No se pudo fijar el mensaje.');
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await unpin(messageId);
    } catch (err) {
      console.error('Error desfijando mensaje', err);
      setActionError(err instanceof Error ? err.message : 'No se pudo desfijar el mensaje.');
    }
  };

  const handleFreeze = async (hours: number) => {
    if (!room || !user) return;
    try {
      await freezeChatRoom(room.id, user.id, hours);
      setInputText('');
      setFreezeMenuOpen(false);
    } catch (err) {
      console.error('Error pausando el chat', err);
      setSendError(getErrorMessage(err, 'No se pudo pausar el chat.'));
      setFreezeMenuOpen(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!room || !user) return;
    try {
      await unfreezeChatRoom(room.id, user.id);
    } catch (err) {
      console.error('Error reanudando el chat', err);
      setActionError(getErrorMessage(err, 'No se pudo reanudar el chat.'));
    }
  };

  const handleClean = async () => {
    if (!room) return;
    try {
      const count = await cleanChatRoomMessages(room.id);
      setCleanupResult(`Se limpiaron ${count} mensaje${count === 1 ? '' : 's'}.`);
      setInputText('');
    } catch (err) {
      console.error('Error limpiando el chat', err);
      setSendError(getErrorMessage(err, 'No se pudo limpiar el chat.'));
    } finally {
      setCleanConfirmOpen(false);
    }
  };

  const handlePurge = async () => {
    if (!room) return;
    try {
      const count = await purgeChatRoomMessages(room.id);
      setCleanupResult(`Se purgaron ${count} mensaje${count === 1 ? '' : 's'}.`);
      setInputText('');
    } catch (err) {
      console.error('Error purgando el chat', err);
      setSendError(getErrorMessage(err, 'No se pudo purgar el chat.'));
    } finally {
      setPurgeConfirmOpen(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // Comandos de moderacion: no son mensajes, no pasan por el chequeo
    // anti-spam ni se guardan en el chat.
    if (isFreezeDraft) {
      setFreezeMenuOpen(true);
      return;
    }
    if (isCleanCommand) {
      setCleanConfirmOpen(true);
      return;
    }
    if (isPurgeCommand) {
      setPurgeConfirmOpen(true);
      return;
    }

    const draft = inputText.trim();
    if ((!draft && !pendingFile) || draft.length > MAX_LENGTH) return;
    // Sin texto (solo adjunto), el chequeo anti-spam necesita algo no vacio
    // para evaluar; se usa una marca especifica del archivo, no un valor fijo,
    // para no confundir dos fotos distintas mandadas seguidas con un duplicado.
    const spamCheckText = draft || (pendingFile ? `📎 ${pendingFile.name}:${pendingFile.size}` : '');
    if (!guard.verify(spamCheckText)) return;

    if (isAnnouncementDraft) {
      if (!stripAnnouncementTrigger(draft)) {
        setSendError('Escribí el contenido del anuncio además de "@todos".');
        return;
      }
      // Un anuncio le llega a todos, esten o no conectados: se confirma antes
      // de mandarlo para que escribir @todos por error no dispare nada solo.
      setConfirmingAnnouncement(true);
      return;
    }

    await performSend(draft, false);
  };

  if (loading || banLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Cargando sala...</div>;
  }

  if (myBan) {
    return (
      <div className="panel-container flex flex-col h-full overflow-hidden">
        <ChatBannedScreen ban={myBan} />
      </div>
    );
  }

  if (!room) {
    return <div className="flex items-center justify-center h-full text-red-500">Sala no encontrada</div>;
  }

  // Bloqueados y silenciados desaparecen de la sala compartida, sin importar
  // que la mayoria de la gente si los vea.
  const visibleMessages = messages.filter((msg) => !moderation.hiddenUserIds.has(msg.user_id));
  const displayRoom = roomOverride ?? room;

  return (
    <div className="panel-container flex flex-col h-full overflow-hidden">
      <ChatTabs
        active={activeTab}
        onChange={setActiveTab}
        roomName={room.name}
        onlineCount={onlineCount}
        savedCount={savedMessages.length}
        dmSessions={Object.values(dm.sessions)}
        onToggleDmSession={(session: DmSession) =>
          session.minimized ? dm.openSession(session.userId, session.label, session.avatarUrl) : dm.minimizeSession(session.userId)
        }
        isStaff={isStaff}
        pendingReportCount={reportedMessages.reports.length}
        onOpenRoomInfo={() => setRoomInfoOpen(true)}
        isFrozen={isRoomFrozen}
      />

      {activeTab === 'saved' && (
        <SavedMessagesPanel
          messages={savedMessages}
          onUnsave={(message) => void handleToggleSaved(message)}
        />
      )}

      {activeTab === 'reports' && isStaff && (
        <ReportedMessagesPanel
          reports={reportedMessages.reports}
          onDismiss={(reportId) => void reportedMessages.dismiss(reportId)}
          onDeleteMessage={(report) => void reportedMessages.deleteMessage(report)}
        />
      )}


      {activeTab === 'messages' && (
      <>
      {actionError && (
        <p className="px-4 py-1.5 text-xs font-medium text-state-danger bg-state-danger-soft">
          {actionError}
        </p>
      )}

      <PinnedMessagesBanner
        pinned={pinned}
        canUnpin={isStaff}
        onUnpin={(messageId) => void handleUnpin(messageId)}
      />

      {/* Message List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {visibleMessages.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-gray-500 mt-10">
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
            <div key={msg.id} className={`flex gap-2 group items-start ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setAuthorMenuFor(authorMenuFor === msg.id ? null : msg.id)}
                    className="flex-shrink-0"
                    title={msg.user_profile?.full_name || 'Usuario'}
                  >
                    <img
                      src={msg.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user_profile?.full_name || 'U'}&background=3b82f6&color=fff`}
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
                  <div className="flex items-center gap-2 h-8 mb-1">
                    <button
                      type="button"
                      onClick={() => setAuthorMenuFor(authorMenuFor === msg.id ? null : msg.id)}
                      className="font-medium text-sm text-ink dark:text-gray-200 hover:text-primary transition-colors"
                    >
                      {msg.user_profile?.full_name || 'Usuario'}
                    </button>
                    <span className="text-[10px] text-ink-muted font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                <div className={`relative min-w-0 max-w-full px-4 py-2.5 text-[13px] sm:text-sm break-words break-all shadow-sm
                  ${isOwn 
                    ? 'bg-primary-soft text-slate-800 dark:bg-gray-800 dark:text-gray-100 rounded-2xl rounded-tr-sm' 
                    : 'bg-white dark:bg-gray-800 text-ink dark:text-gray-100 rounded-2xl rounded-tl-sm border border-line dark:border-gray-700'
                  }`}
                >
                  {/* Reply Quote */}
                  {msg.reply_to_message && (
                    <div className={`mb-2 pl-2 border-l-2 text-xs py-1 pr-2 rounded-r flex flex-col
                      ${isOwn 
                        ? 'border-primary bg-white/50 text-slate-600' 
                        : 'border-blue-400 bg-slate-50 dark:bg-gray-700 text-ink-muted'
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

                  {isOwn && (
                    <span className="absolute -bottom-5 right-1 text-[10px] text-ink-muted font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Acciones del mensaje */}
              <div className={`relative opacity-0 group-hover:opacity-100 transition-opacity flex items-center ${isOwn ? 'mr-auto' : 'ml-auto'}`}>
                <button
                  onClick={() => void handleToggleSaved(msg)}
                  className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors ${
                    savedIds.has(msg.id) ? 'text-primary' : 'text-slate-400 hover:text-primary'
                  }`}
                  title={savedIds.has(msg.id) ? 'Quitar de guardados' : 'Guardar mensaje'}
                >
                  <svg className="w-4 h-4" fill={savedIds.has(msg.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
                  </svg>
                </button>

                <button
                  onClick={() => void highlights.toggleHighlight(msg)}
                  className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors ${
                    highlights.myHighlightedIds.has(msg.id) ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
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
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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
                    className="p-1.5 text-slate-400 hover:text-state-danger hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  title="Responder"
                >
                  <Icon.Reply />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Unread Badge Overlay */}
      {!isAtBottom && unreadCount > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button 
            onClick={scrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 transition-all"
          >
            Hay {unreadCount} {unreadCount === 1 ? 'mensaje por leer' : 'mensajes por leer'} ↓
          </button>
        </div>
      )}

      {isRoomFrozen && room?.frozen_until && (
        <ChatFrozenBanner frozenUntil={room.frozen_until} isStaff={isStaff} onUnfreeze={() => void handleUnfreeze()} />
      )}

      {/* Composer: si la sala esta pausada, solo staff sigue viendolo. */}
      {(!isRoomFrozen || isStaff) && (
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-line dark:border-gray-800 z-10 flex flex-col">
        {cleanupResult && (
          <p className="mb-2 rounded-lg bg-state-success-soft px-3 py-1.5 text-xs font-medium text-state-success">
            {cleanupResult}
          </p>
        )}

        {isFreezeDraft && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Enviar va a abrir el selector de duración para pausar el chat.
          </p>
        )}

        {isCleanCommand && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-state-danger">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Enviar va a pedir confirmación para limpiar el chat (menos fijados, destacados y guardados).
          </p>
        )}

        {isPurgeCommand && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-state-danger">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Enviar va a pedir confirmación para purgar TODO el historial, sin excepciones.
          </p>
        )}

        {isAnnouncementDraft && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
            </svg>
            Este mensaje se va a enviar como anuncio a todos los usuarios.
          </p>
        )}

        {(guard.blockedReason || sendError) && (
          <p className="mb-2 rounded-lg bg-state-danger-soft px-3 py-1.5 text-xs font-medium text-state-danger">
            {guard.blockedReason || sendError}
          </p>
        )}

        {replyTo && (
          <div className="mb-3 pl-3 border-l-2 border-primary flex justify-between items-center bg-surface-muted dark:bg-gray-800 py-1.5 pr-2 rounded-r-md text-sm shadow-sm transition-all">
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-primary text-[10px] uppercase tracking-wider">Respondiendo a {replyTo.user_profile?.full_name}</span>
              <span className="text-ink dark:text-gray-300 truncate text-xs mt-0.5">
                {toPlainText(replyTo.content)}
              </span>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
              <Icon.Close />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="relative">
          {showEmojis && (
            <EmojiPicker
              onClose={() => setShowEmojis(false)}
              onSelect={(emoji) => {
                setInputText((prev) => `${prev}${emoji}`);
                setShowEmojis(false);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
            />
          )}

          {mentions.isOpen && (
            <MentionAutocomplete
              suggestions={mentions.suggestions}
              highlighted={mentions.highlighted}
              onHighlight={mentions.setHighlighted}
              onSelect={mentions.select}
            />
          )}

          {pendingFile && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl bg-surface-muted dark:bg-gray-800 border border-line dark:border-gray-700">
              {pendingPreviewUrl ? (
                <img src={pendingPreviewUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-900 text-ink-muted flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              )}
              <span className="flex-1 min-w-0 text-xs text-ink dark:text-gray-100 truncate">
                {pendingFile.name}
              </span>
              <button
                type="button"
                onClick={clearPendingFile}
                className="p-1 rounded-full text-ink-muted hover:bg-white dark:hover:bg-gray-700 hover:text-ink transition-colors flex-shrink-0"
                title="Quitar adjunto"
              >
                <Icon.Close />
              </button>
            </div>
          )}

          <div className="flex items-end gap-1 border border-line dark:border-gray-700 bg-white dark:bg-gray-800 rounded-[20px] px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary-soft transition-all shadow-sm">

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              className="hidden"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
              title="Adjuntar archivo (máx. 3 MB)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                guard.clearBlock();
                mentions.syncFromInput(e.target.value, e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) => {
                const target = e.currentTarget;
                mentions.syncFromInput(target.value, target.selectionStart ?? target.value.length);
              }}
              onBlur={() => setTimeout(mentions.close, 150)}
              placeholder={
                isStaff
                  ? 'Escribe tu mensaje... usa @ para mencionar o "@todos" al inicio para anunciar'
                  : 'Escribe tu mensaje... usa @ para mencionar'
              }
              className="flex-1 resize-none bg-transparent border-none p-2 text-[14px] text-ink dark:text-gray-100 focus:ring-0 focus:outline-none max-h-32 min-h-[40px] leading-relaxed placeholder:text-slate-400"
              rows={1}
              maxLength={MAX_LENGTH}
              onKeyDown={(e) => {
                if (mentions.handleKeyDown(e)) return;

                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />

            {isAnnouncementDraft && (
              <span
                className="p-2 mb-0.5 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0 animate-fade-in"
                title="Este mensaje se enviará como anuncio a todos"
              >
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
                </svg>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowEmojis((prev) => !prev)}
              className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
              title="Emoticones"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>

            <button
              type="submit"
              disabled={(!inputText.trim() && !pendingFile) || inputText.length > MAX_LENGTH || uploadingAttachment}
              className="w-10 h-10 mb-0.5 ml-1 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-slate-400 text-white rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all transform active:scale-95"
            >
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
          
          <div className="flex justify-end items-center mt-2 px-2">
            <div className="flex gap-3">
              <span
                className={`text-[10px] font-medium ${
                  inputText.length >= MAX_LENGTH - 20 ? 'text-state-danger' : 'text-ink-muted'
                }`}
              >
                {inputText.length} / {MAX_LENGTH}
              </span>
            </div>
          </div>
        </form>
      </div>
      )}
      </>
      )}

      {profileUser && (
        <PublicProfileModal
          userId={profileUser.id}
          fallbackName={profileUser.label}
          fallbackAvatarUrl={profileUser.avatarUrl}
          onClose={() => setProfileUser(null)}
          onSendMessage={
            profileUser.id === user?.id
              ? undefined
              : () => dm.openSession(profileUser.id, profileUser.label, profileUser.avatarUrl)
          }
          isBlocked={profileUser.id !== user?.id ? moderation.blockedIds.has(profileUser.id) : undefined}
          onToggleBlock={
            profileUser.id === user?.id
              ? undefined
              : (blocked) => void moderation.toggleBlock(profileUser.id, blocked)
          }
          isMuted={profileUser.id !== user?.id ? moderation.mutedIds.has(profileUser.id) : undefined}
          onToggleMute={
            profileUser.id === user?.id
              ? undefined
              : (muted) => void moderation.toggleMute(profileUser.id, muted)
          }
          onBan={
            isStaff && profileUser.id !== user?.id
              ? () => {
                  setBanTarget(profileUser);
                  setProfileUser(null);
                }
              : undefined
          }
        />
      )}

      {banTarget && (
        <BanUserMenu
          userName={banTarget.label}
          onCancel={() => setBanTarget(null)}
          onConfirm={(reason, bannedUntil) => {
            if (!user) return;
            void banUser(banTarget.id, user.id, reason, bannedUntil);
            setBanTarget(null);
          }}
        />
      )}

      {Object.values(dm.sessions)
        .filter((session) => !session.minimized)
        .map((session, index) => (
          <DirectMessageWindow
            key={session.userId}
            userId={session.userId}
            userName={session.label}
            cascadeIndex={index}
            onMinimize={() => dm.minimizeSession(session.userId)}
            onClose={() => dm.closeSession(session.userId)}
          />
        ))}

      {confirmingAnnouncement && (
        <ConfirmAnnouncementModal
          content={stripAnnouncementTrigger(inputText.trim())}
          onCancel={() => setConfirmingAnnouncement(false)}
          onConfirm={() => {
            setConfirmingAnnouncement(false);
            void performSend(inputText.trim(), true);
          }}
        />
      )}

      {freezeMenuOpen && displayRoom && (
        <FreezeDurationMenu
          roomName={displayRoom.name}
          onCancel={() => setFreezeMenuOpen(false)}
          onConfirm={(hours) => void handleFreeze(hours)}
        />
      )}

      {cleanConfirmOpen && (
        <ConfirmDangerModal
          title="Limpiar el chat"
          message='Se van a borrar todos los mensajes de la sala, excepto los fijados, destacados y guardados por alguien. Esta acción no se puede deshacer.'
          confirmLabel="Limpiar"
          onCancel={() => setCleanConfirmOpen(false)}
          onConfirm={() => void handleClean()}
        />
      )}

      {purgeConfirmOpen && (
        <ConfirmDangerModal
          title="Purgar el chat"
          message="Se va a borrar TODO el historial de la sala, incluidos los mensajes fijados, destacados y guardados. Esta acción no se puede deshacer."
          confirmLabel="Purgar todo"
          onCancel={() => setPurgeConfirmOpen(false)}
          onConfirm={() => void handlePurge()}
        />
      )}

      {roomInfoOpen && displayRoom && (
        <RoomInfoModal
          room={displayRoom}
          isStaff={isStaff}
          highlights={highlights.highlights}
          onRemoveHighlight={(messageId, highlightedBy) =>
            void highlights.removeAnyHighlight(messageId, highlightedBy)
          }
          onClose={() => setRoomInfoOpen(false)}
          onRoomUpdated={setRoomOverride}
          currentUserId={user?.id}
          memberSearch={memberSearch}
          onMemberSearchChange={setMemberSearch}
          onOpenProfile={(target) => {
            setProfileUser(target);
            setRoomInfoOpen(false);
          }}
          onOpenDirectMessage={(target) => {
            dm.openSession(target.id, target.label, target.avatarUrl);
            setRoomInfoOpen(false);
          }}
        />
      )}
    </div>
  );
}
