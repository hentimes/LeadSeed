import {
  fetchChatProfileById,
  fetchChatRoomById,
  fetchDefaultChatRoom,
  fetchHasUnreadChatMessages,
  fetchReplyMessageById,
  insertChatMessage,
  removeChatChannel,
  subscribeToAnyChatMessageInsert,
  subscribeToChatRoomMessageInserts,
  upsertChatRoomRead,
} from '../repositories/chatRepository';
import type { ChatMessage, ChatRoom } from '../types';

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

export async function sendRoomMessage(
  roomId: string,
  userId: string,
  content: string,
  replyToId?: string
): Promise<void> {
  if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error(`Mensaje excede los ${MAX_CHAT_MESSAGE_LENGTH} caracteres`);
  }

  await insertChatMessage(roomId, userId, content, replyToId);
}

export function hasUnreadChatMessages(): Promise<boolean> {
  return fetchHasUnreadChatMessages();
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
