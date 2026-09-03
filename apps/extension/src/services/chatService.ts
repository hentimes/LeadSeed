import { toggleChatReaction as toggleChatReactionRepo } from '../repositories/chatReactionsRepository';
import {
  cleanChatRoomMessages as cleanChatRoomMessagesRepo,
  deleteChatMessage as deleteChatMessageRepo,
  fetchChatProfileById,
  fetchChatRoomById,
  fetchDefaultChatRoom,
  fetchPendingAnnouncements,
  fetchPinnedMessages,
  fetchReplyMessageById,
  fetchRoomMessages,
  fetchSavedMessageIds,
  fetchSavedMessages,
  fetchUnreadChatCount,
  freezeChatRoom as freezeChatRoomRepo,
  insertChatMessage,
  pinChatMessage,
  purgeChatRoomMessages as purgeChatRoomMessagesRepo,
  removeChatChannel,
  saveChatMessage,
  subscribeToAnyChatMessageInsert,
  subscribeToChatRoomMessageInserts,
  subscribeToChatRoomUpdates as subscribeToChatRoomUpdatesRepo,
  subscribeToPinnedMessageChanges,
  subscribeToRoomAttachmentInserts as subscribeToRoomAttachmentInsertsRepo,
  subscribeToRoomMessageDeletes as subscribeToRoomMessageDeletesRepo,
  subscribeToRoomMessageUpdates as subscribeToRoomMessageUpdatesRepo,
  unfreezeChatRoom as unfreezeChatRoomRepo,
  unpinChatMessage,
  unsaveChatMessage,
  upsertChatRoomRead,
} from '../repositories/chatRepository';
import type { ChatMessage, ChatPinnedMessage, ChatReactionKind, ChatRoom } from '../types';
import type { ChatAttachment } from './chatAttachmentsService';

/** Cuanto dura fijado un mensaje por defecto. Elegible en el futuro por UI. */
export const DEFAULT_PIN_DURATION_HOURS = 24;

/**
 * Lo que el usuario puede escribir. Se cuenta sobre el texto visible, con las
 * menciones como "@Nombre".
 */
export const MAX_CHAT_MESSAGE_DISPLAY_LENGTH = 140;

/**
 * Lo que se guarda. Al serializar, cada mencion crece hasta ~60 caracteres por
 * el identificador, asi que el limite almacenado es mayor que el visible.
 * Debe coincidir con el CHECK de chat_messages.content (migracion 072).
 */
export const MAX_CHAT_MESSAGE_LENGTH = 1000;

async function hydrateIncomingMessage(message: ChatMessage): Promise<ChatMessage> {
  const [profile, replyMessage] = await Promise.all([
    fetchChatProfileById(message.user_id),
    message.reply_to_id ? fetchReplyMessageById(message.reply_to_id) : Promise.resolve(null),
  ]);

  return {
    ...message,
    user_profile: profile ?? undefined,
    reply_to_message: replyMessage ?? undefined,
  };
}

export async function resolveChatRoom(roomId?: string): Promise<ChatRoom | null> {
  return roomId ? fetchChatRoomById(roomId) : fetchDefaultChatRoom();
}

export { updateChatRoomInfo } from '../repositories/chatRepository';

/**
 * Historial de la sala. Sin esto el chat solo mostraba lo que llegaba estando
 * la seccion abierta, y todo lo escrito mientras el usuario estaba en otro
 * lado quedaba invisible aunque estuviera guardado.
 */
export async function loadRoomHistory(roomId: string): Promise<ChatMessage[]> {
  const messages = await fetchRoomMessages(roomId);

  // El perfil ya viene embebido; solo faltan las citas de las respuestas.
  const quoted = await Promise.all(
    messages.map((message) =>
      message.reply_to_id ? fetchReplyMessageById(message.reply_to_id) : Promise.resolve(null)
    )
  );

  return messages.map((message, index) => ({
    ...message,
    reply_to_message: quoted[index] ?? undefined,
  }));
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  const channel = subscribeToChatRoomMessageInserts(roomId, async (message) => {
    const hydratedMessage = await hydrateIncomingMessage(message);
    onMessage(hydratedMessage);
  });

  return () => {
    removeChatChannel(channel);
  };
}

/** Anuncios que llegaron mientras el usuario no estaba conectado. */
export function loadPendingAnnouncements(): Promise<ChatMessage[]> {
  return fetchPendingAnnouncements();
}

/**
 * Adjuntos nuevos de la sala. El mensaje se crea antes que el adjunto (subir
 * el archivo tarda), asi que esto es lo que completa el mensaje ya visible
 * -- tanto para quien lo envio como para el resto -- sin esperar un refetch.
 */
export function subscribeToRoomAttachmentInserts(
  roomId: string,
  onInsert: (attachment: ChatAttachment) => void
): () => void {
  const channel = subscribeToRoomAttachmentInsertsRepo(roomId, onInsert);
  return () => {
    removeChatChannel(channel);
  };
}

// --- @silenciar: pausar la sala ---------------------------------------------

function formatFreezeUntil(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Pausa la sala y deja un anuncio en el chat avisando hasta cuando. El
 * anuncio reutiliza is_announcement (misma via que @todos), asi que tambien
 * dispara la alerta de "anuncio del equipo" para quien no esta conectado.
 */
export async function freezeChatRoom(
  roomId: string,
  frozenBy: string,
  hours: number
): Promise<void> {
  const frozenUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await freezeChatRoomRepo(roomId, frozenBy, frozenUntil);
  await insertChatMessage(
    roomId,
    frozenBy,
    `El chat quedó pausado hasta ${formatFreezeUntil(frozenUntil)}.`,
    undefined,
    true,
    // De sistema: sigue avisando a quien no estaba conectado, pero se dibuja
    // como una linea chiquita y no como un bloque a ancho completo. Una sala
    // que se pausa y se reanuda un par de veces acumulaba cuatro bloques
    // ambar que tapaban la conversacion.
    true
  );
}

export async function unfreezeChatRoom(roomId: string, unfrozenBy: string): Promise<void> {
  await unfreezeChatRoomRepo(roomId);
  await insertChatMessage(
    roomId,
    unfrozenBy,
    'El chat volvió a estar disponible.',
    undefined,
    true,
    true
  );
}

/**
 * Pone o quita una reaccion a un mensaje.
 *
 * Envoltura fina sobre el repositorio: la regla de negocio -que solo se pueda
 * reaccionar en nombre propio y solo con los tres emojis de la lista- la
 * impone la base (politica RLS y CHECK de la migracion 119), no esta capa.
 */
export function toggleChatReaction(
  messageId: string,
  userId: string,
  reaction: ChatReactionKind,
  reacted: boolean
): Promise<void> {
  return toggleChatReactionRepo(messageId, userId, reaction, reacted);
}

export function subscribeToChatRoomUpdates(
  roomId: string,
  onUpdate: (room: ChatRoom) => void
): () => void {
  const channel = subscribeToChatRoomUpdatesRepo(roomId, onUpdate);
  return () => {
    removeChatChannel(channel);
  };
}

// --- @limpiar / @purgar -----------------------------------------------------

/** Borra todo lo que no este fijado, destacado o guardado. Devuelve cuantos. */
export function cleanChatRoomMessages(roomId: string): Promise<number> {
  return cleanChatRoomMessagesRepo(roomId);
}

/** Borra absolutamente todo, sin excepciones. Devuelve cuantos. */
export function purgeChatRoomMessages(roomId: string): Promise<number> {
  return purgeChatRoomMessagesRepo(roomId);
}

export function subscribeToRoomMessageDeletes(
  roomId: string,
  onDelete: (messageId: string) => void
): () => void {
  const channel = subscribeToRoomMessageDeletesRepo(roomId, onDelete);
  return () => {
    removeChatChannel(channel);
  };
}

// --- Borrado de un mensaje puntual (admin/helper) --------------------------

/** Reemplaza el contenido del mensaje por un aviso, en vez de borrar la fila. */
export function deleteChatMessage(messageId: string): Promise<void> {
  return deleteChatMessageRepo(messageId);
}

export function subscribeToRoomMessageUpdates(
  roomId: string,
  onUpdate: (message: ChatMessage) => void
): () => void {
  const channel = subscribeToRoomMessageUpdatesRepo(roomId, onUpdate);
  return () => {
    removeChatChannel(channel);
  };
}

/** Devuelve el id del mensaje creado, para poder asociarle un adjunto despues. */
export async function sendRoomMessage(
  roomId: string,
  userId: string,
  content: string,
  replyToId?: string,
  isAnnouncement = false
): Promise<string> {
  if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error(`Mensaje excede los ${MAX_CHAT_MESSAGE_LENGTH} caracteres`);
  }

  return insertChatMessage(roomId, userId, content, replyToId, isAnnouncement);
}

export function countUnreadChatMessages(): Promise<number> {
  return fetchUnreadChatCount();
}

export function markChatRoomRead(roomId: string, userId: string): Promise<void> {
  return upsertChatRoomRead(roomId, userId);
}

/**
 * Avisa cuando llega un mensaje de otra persona, sin importar la sala.
 * Alimenta el indicador de mensajes sin leer del menu de navegacion.
 */
export function subscribeToIncomingChatMessages(
  currentUserId: string,
  onIncoming: () => void
): () => void {
  const channel = subscribeToAnyChatMessageInsert((message) => {
    if (message.user_id !== currentUserId) {
      onIncoming();
    }
  });

  return () => {
    removeChatChannel(channel);
  };
}

// --- Mensajes guardados ---------------------------------------------------

export function loadSavedMessages(userId: string): Promise<ChatMessage[]> {
  return fetchSavedMessages(userId);
}

export function loadSavedMessageIds(userId: string): Promise<Set<string>> {
  return fetchSavedMessageIds(userId).then((ids) => new Set(ids));
}

export function setMessageSaved(userId: string, messageId: string, saved: boolean): Promise<void> {
  return saved ? saveChatMessage(userId, messageId) : unsaveChatMessage(userId, messageId);
}

// --- Mensajes fijados ------------------------------------------------------

export function loadPinnedMessages(roomId: string): Promise<ChatPinnedMessage[]> {
  return fetchPinnedMessages(roomId);
}

export function pinRoomMessage(
  messageId: string,
  roomId: string,
  pinnedBy: string,
  hours = DEFAULT_PIN_DURATION_HOURS
): Promise<void> {
  const pinnedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return pinChatMessage(messageId, roomId, pinnedBy, pinnedUntil);
}

export function unpinRoomMessage(messageId: string): Promise<void> {
  return unpinChatMessage(messageId);
}

export function subscribeToPinnedMessages(roomId: string, onChange: () => void): () => void {
  const channel = subscribeToPinnedMessageChanges(roomId, onChange);
  return () => removeChatChannel(channel);
}
