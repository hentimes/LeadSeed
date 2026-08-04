import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchConversation,
  insertDirectMessage,
  markConversationRead,
  subscribeToConversation,
  type DirectMessage,
} from '../repositories/directMessagesRepository';

export function useDirectMessages(otherUserId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);

    void fetchConversation(user.id, otherUserId).then((history) => {
      if (cancelled) return;
      setMessages(history);
      setLoading(false);
      void markConversationRead(user.id, otherUserId);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (!user) return;

    return subscribeToConversation(user.id, otherUserId, (message) => {
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
      void markConversationRead(user.id, otherUserId);
    });
  }, [user?.id, otherUserId]);

  const send = useCallback(
    async (text: string) => {
      if (!user) return;

      await insertDirectMessage(user.id, otherUserId, text);
      // El canal realtime solo trae lo que uno recibe, asi que el propio
      // mensaje se agrega en el momento.
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          sender_id: user.id,
          receiver_id: otherUserId,
          message: text,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    },
    [user?.id, otherUserId]
  );

  return { messages, loading, send, currentUserId: user?.id };
}
