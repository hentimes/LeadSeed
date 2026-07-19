import {
  fetchChatProfileById,
  fetchChatRoomById,
  fetchDefaultChatRoom,
  fetchReplyMessageById,
  insertChatMessage,
  removeChatChannel,
  subscribeToChatRoomMessageInserts,
} from '../repositories/chatRepository';
import type { ChatMessage, ChatRoom } from '../types';

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
  if (content.length > 120) {
    throw new Error('Mensaje excede los 120 caracteres');
  }

  await insertChatMessage(roomId, userId, content, replyToId);
}
