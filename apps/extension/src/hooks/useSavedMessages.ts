import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loadSavedMessageIds, loadSavedMessages, setMessageSaved } from '../services/chatService';
import type { ChatMessage } from '../types';

export function useSavedMessages() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedMessages, setSavedMessages] = useState<ChatMessage[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [ids, messages] = await Promise.all([
      loadSavedMessageIds(user.id),
      loadSavedMessages(user.id),
    ]);
    setSavedIds(ids);
    setSavedMessages(messages);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSaved = useCallback(
    async (message: ChatMessage) => {
      if (!user) return;
      const isSaved = savedIds.has(message.id);

      // Optimista: la lista y el marcador responden antes de la confirmacion.
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(message.id);
        else next.add(message.id);
        return next;
      });
      setSavedMessages((prev) =>
        isSaved ? prev.filter((item) => item.id !== message.id) : [message, ...prev]
      );

      try {
        await setMessageSaved(user.id, message.id, !isSaved);
      } catch {
        await refresh();
      }
    },
    [user, savedIds, refresh]
  );

  return { savedIds, savedMessages, toggleSaved, refresh };
}
