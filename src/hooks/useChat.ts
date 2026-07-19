import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage, ChatRoom } from '../types';
import { resolveChatRoom, sendRoomMessage, subscribeToRoomMessages } from '../services/chatService';

export function useChat(roomId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<ChatRoom | null>(null);

  useEffect(() => {
    let isMounted = true;

    resolveChatRoom(roomId).then((resolvedRoom) => {
      if (!isMounted) return;
      setRoom(resolvedRoom);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!room) return;

    return subscribeToRoomMessages(room.id, (message) => {
      setMessages((prev) => [...prev, message]);
    });
  }, [room]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!user || !room) return;
      await sendRoomMessage(room.id, user.id, content, replyToId);
    },
    [user, room]
  );

  return {
    room,
    messages,
    loading,
    sendMessage,
  };
}
