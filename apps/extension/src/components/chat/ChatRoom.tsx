import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineDirectory } from '../../hooks/useOnlineDirectory';
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete';
import { CHAT_COMMAND_SUGGESTIONS } from '../../config/chatCommands';
import { usePostMentionSuggestions } from '../../hooks/usePostMentionSuggestions';
import type { Mention } from '../../types/mentions';
import type { ChatMessage, DmSession } from '../../types';
import ChatTabs, { type ChatTab } from './ChatTabs';
import SavedMessagesPanel from './SavedMessagesPanel';
import PinnedMessagesBanner from './PinnedMessagesBanner';
import DirectMessageWindow from './DirectMessageWindow';
import PublicProfileModal from '../profile/PublicProfileModal';
import ConfirmAnnouncementModal from './ConfirmAnnouncementModal';
import { useMessageGuard } from '../../hooks/useMessageGuard';
import { useSavedMessages } from '../../hooks/useSavedMessages';
import { usePinnedMessages } from '../../hooks/usePinnedMessages';
import { useDirectMessageSessions } from '../../hooks/useDirectMessageSessions';
import { useChatModeration } from '../../hooks/useChatModeration';
import { useReportedMessages } from '../../hooks/useReportedMessages';
import ReportedMessagesPanel from './ReportedMessagesPanel';
import { useChatBanStatus } from '../../hooks/useChatBanStatus';
import { banUser } from '../../services/chatModerationService';
import ChatBannedScreen from './ChatBannedScreen';
import BanUserMenu from './BanUserMenu';
import { useHighlightedMessages } from '../../hooks/useHighlightedMessages';
import RoomInfoModal from './RoomInfoModal';
import type { ChatRoom as ChatRoomType } from '../../types';
import { attachFileToMessage } from '../../services/chatAttachmentsService';
import FreezeDurationMenu from './FreezeDurationMenu';
import ConfirmDangerModal from './ConfirmDangerModal';
import ChatFrozenBanner from './ChatFrozenBanner';
import ChatComposer from './ChatComposer';
import ChatMessageList from './ChatMessageList';
import ChatRoomSkeleton from './ChatRoomSkeleton';
import { ChatIcon } from './ChatIcons';
import { Button, EmptyState } from '../../design';
import {
  MAX_CHAT_MESSAGE_DISPLAY_LENGTH as MAX_LENGTH,
  cleanChatRoomMessages,
  deleteChatMessage,
  freezeChatRoom,
  markChatRoomRead,
  purgeChatRoomMessages,
  unfreezeChatRoom,
} from '../../services/chatService';
import { getErrorMessage } from '../../utils/errorMessage';
import { buildAttachmentFingerprint, usePendingAttachment } from '../../hooks/usePendingAttachment';
import { useChatScroll } from '../../hooks/useChatScroll';
import { useChatReactions } from '../../hooks/useChatReactions';

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
  const { ban: myBan, loading: banLoading } = useChatBanStatus();
  const [banTarget, setBanTarget] = useState<{ id: string; label: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ChatTab>('messages');
  const [memberSearch, setMemberSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [profileUser, setProfileUser] = useState<{ id: string; label: string; avatarUrl?: string } | null>(null);
  const dm = useDirectMessageSessions(user?.id);
  /*
   * Un unico estado para los tres menus de mensaje (mas acciones, fijar,
   * reportar), con el formato `${idDelMensaje}:${menu}`. Antes eran tres
   * estados sueltos y cerrar uno al abrir otro dependia de acordarse de
   * limpiar los otros dos a mano en cada sitio.
   */
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [authorMenuFor, setAuthorMenuFor] = useState<string | null>(null);
  const guard = useMessageGuard();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const attachment = usePendingAttachment();
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // El termino viaja por estado porque las sugerencias de publicaciones se
  // piden al servidor y alimentan de vuelta al mismo autocompletado.
  const [mentionTerm, setMentionTerm] = useState('');
  const postSuggestions = usePostMentionSuggestions(mentionTerm);

  const mentions = useMentionAutocomplete({
    text: inputText,
    excludeUserId: user?.id,
    extraSuggestions: postSuggestions,
    commands: isStaff ? CHAT_COMMAND_SUGGESTIONS : undefined,
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



  // Marca la sala como leida al abrirla y con cada mensaje visto, para que el
  // indicador del menu de navegacion no quede encendido.
  useEffect(() => {
    if (!room || !user) return;
    void markChatRoomRead(room.id, user.id);
  }, [room?.id, user?.id, messages.length]);


  // Una mencion de usuario abre la pestana de integrantes filtrada por esa
  // persona; las de publicacion las resuelve quien monta el chat.
  const handleMentionClick = (mention: Mention) => {
    if (mention.kind === 'user') {
      setProfileUser({ id: mention.id, label: mention.label });
      return;
    }

    onMentionClick?.(mention);
  };

  /*
   * `prefers-reduced-motion` es la casilla del sistema para pedir que las
   * interfaces no se muevan. Se lee aca y no dentro de `useChatScroll` porque
   * ese hook vive en la capa de dominio, donde el DOM esta prohibido por la
   * frontera de portabilidad a movil. Se escucha el cambio, no solo el valor
   * inicial: la preferencia se puede activar con la extension abierta.
   */
  const [animarElScroll, setAnimarElScroll] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sincronizar = () => setAnimarElScroll(!consulta.matches);

    sincronizar();
    consulta.addEventListener('change', sincronizar);
    return () => consulta.removeEventListener('change', sincronizar);
  }, []);

  const scroll = useChatScroll(messages.length, animarElScroll);

  /*
   * Se le pasan TODOS los mensajes cargados y no solo los visibles: filtrar por
   * moderacion aca obligaria a mover ese calculo por encima de los returns
   * tempranos, y traer las reacciones de un mensaje que esta oculto no cuesta
   * nada -no se pintan- mientras que recalcular la lista en cada render de la
   * sala si.
   */
  const reactions = useChatReactions(
    room?.id,
    user?.id,
    messages.map((message) => message.id)
  );
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
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null);


  const performSend = async (content: string, asAnnouncement: boolean) => {
    const finalContent = asAnnouncement ? stripAnnouncementTrigger(content) : content;
    const fileToSend = attachment.file;

    try {
      const messageId = await sendMessage(mentions.serialize(finalContent), replyTo?.id, asAnnouncement);
      guard.confirmSent(content || (fileToSend ? buildAttachmentFingerprint(fileToSend) : ''));
      setInputText('');
      setReplyTo(null);
      setSendError('');
      mentions.reset();
      attachment.clear();
      // Forzar scroll al fondo después de enviar
      setTimeout(scroll.scrollToBottom, 100);

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
        getErrorMessage(err, 'No se pudo enviar el mensaje. Intentá de nuevo.')
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
      setActionError(getErrorMessage(err, 'No se pudo guardar el mensaje.'));
    }
  };

  const handlePin = async (messageId: string, hours: number) => {
    if (!user) return;
    try {
      await pin(messageId, user.id, hours);
    } catch (err) {
      console.error('Error fijando mensaje', err);
      setActionError(getErrorMessage(err, 'No se pudo fijar el mensaje.'));
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await unpin(messageId);
    } catch (err) {
      console.error('Error desfijando mensaje', err);
      setActionError(getErrorMessage(err, 'No se pudo desfijar el mensaje.'));
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

  const handleDeleteMessage = async () => {
    if (!deleteMessageTarget) return;
    try {
      await deleteChatMessage(deleteMessageTarget.id);
    } catch (err) {
      console.error('Error eliminando el mensaje', err);
      setActionError(getErrorMessage(err, 'No se pudo eliminar el mensaje.'));
    } finally {
      setDeleteMessageTarget(null);
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
    if ((!draft && !attachment.file) || draft.length > MAX_LENGTH) return;
    // Sin texto (solo adjunto), el chequeo anti-spam necesita algo no vacio
    // para evaluar; se usa una marca especifica del archivo, no un valor fijo,
    // para no confundir dos fotos distintas mandadas seguidas con un duplicado.
    const spamCheckText = draft || (attachment.file ? buildAttachmentFingerprint(attachment.file) : '');
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

  // Responder sin enfocar el campo obligaba a un clic extra para escribir.
  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  if (loading || banLoading) {
    return (
      <div className="panel-container h-full overflow-hidden">
        <ChatRoomSkeleton />
      </div>
    );
  }

  if (myBan) {
    return (
      <div className="panel-container flex flex-col h-full overflow-hidden">
        <ChatBannedScreen ban={myBan} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="panel-container flex h-full items-center justify-center">
        <EmptyState
          icon={<ChatIcon.Lock />}
          title="No pudimos abrir la sala"
          description="Puede ser un problema de conexión momentáneo."
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
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
      <ChatMessageList
        visibleMessages={visibleMessages}
        scroll={scroll}
        userId={user?.id}
        isStaff={isStaff}
        savedIds={savedIds}
        highlights={highlights}
        reactionsByMessage={reactions.byMessage}
        reactionsPending={reactions.pending}
        onToggleReaction={(messageId, reaction) => void reactions.toggle(messageId, reaction)}
        moderation={moderation}
        dm={dm}
        openMenuFor={openMenuFor}
        setOpenMenuFor={setOpenMenuFor}
        authorMenuFor={authorMenuFor}
        setAuthorMenuFor={setAuthorMenuFor}
        setReplyTo={handleReply}
        setDeleteMessageTarget={setDeleteMessageTarget}
        setProfileUser={setProfileUser}
        handleMentionClick={handleMentionClick}
        handleToggleSaved={handleToggleSaved}
        handlePin={handlePin}
      />

      {/*
        Aviso de mensajes sin leer. Era `bg-blue-500`, un azul generico ajeno a
        la marca, y se anclaba en `bottom-20`: con el campo de escritura
        colapsado quedaba flotando a media pantalla. `role="status"` para que
        tambien se anuncie a quien no lo ve.
      */}
      {!scroll.isAtBottom && scroll.unreadCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
          <button
            type="button"
            role="status"
            onClick={scroll.scrollToBottom}
            className="animate-scale-in pointer-events-auto flex h-control-sm items-center gap-1.5 rounded-full bg-primary px-3 text-meta font-semibold text-ink-inverse shadow-float transition-colors hover:bg-primary-hover"
          >
            {scroll.unreadCount} {scroll.unreadCount === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}
            <ChatIcon.ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isRoomFrozen && room?.frozen_until && (
        <ChatFrozenBanner frozenUntil={room.frozen_until} isStaff={isStaff} onUnfreeze={() => void handleUnfreeze()} />
      )}

      {/* Composer: si la sala esta pausada, solo staff sigue viendolo. */}
      {(!isRoomFrozen || isStaff) && (
      <ChatComposer
        inputText={inputText}
        setInputText={setInputText}
        handleSend={handleSend}
        textareaRef={textareaRef}
        attachment={attachment}
        fileInputRef={fileInputRef}
        uploadingAttachment={uploadingAttachment}
        showEmojis={showEmojis}
        setShowEmojis={setShowEmojis}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        sendError={sendError}
        cleanupResult={cleanupResult}
        guard={guard}
        mentions={mentions}
        isStaff={isStaff}
        isAnnouncementDraft={isAnnouncementDraft}
        isFreezeDraft={isFreezeDraft}
        isCleanCommand={isCleanCommand}
        isPurgeCommand={isPurgeCommand}
      />
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

      {deleteMessageTarget && (
        <ConfirmDangerModal
          title="Eliminar mensaje"
          message="El mensaje se va a reemplazar por un aviso de que fue eliminado por un administrador. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onCancel={() => setDeleteMessageTarget(null)}
          onConfirm={() => void handleDeleteMessage()}
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
