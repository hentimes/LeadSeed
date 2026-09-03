import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchHighlightedMessages,
  fetchMyHighlightedMessageIds,
  highlightMessage,
  removeHighlight,
  type ChatHighlightedMessage,
} from '../services/chatModerationService';
import type { ChatMessage } from '../types';

/**
 * Destacados de la sala: publicos (los ve cualquiera), a diferencia de
 * "guardados" que es privado por usuario.
 */
export function useHighlightedMessages(roomId?: string) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<ChatHighlightedMessage[]>([]);
  const [myHighlightedIds, setMyHighlightedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const [list, mine] = await Promise.all([
      fetchHighlightedMessages(roomId),
      user ? fetchMyHighlightedMessageIds(user.id) : Promise.resolve([]),
    ]);
    setHighlights(list);
    setMyHighlightedIds(new Set(mine));
  }, [roomId, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleHighlight = useCallback(
    async (message: ChatMessage) => {
      if (!user || !roomId) return;
      const alreadyHighlighted = myHighlightedIds.has(message.id);

      try {
        if (alreadyHighlighted) {
          await removeHighlight(message.id, user.id);
        } else {
          await highlightMessage(message.id, roomId, user.id);
        }
        await refresh();
      } catch (err) {
        console.error('Error al destacar mensaje', err);
      }
    },
    [user, roomId, myHighlightedIds, refresh]
  );

  // Para que staff pueda quitar el destacado de otra persona desde el panel.
  const removeAnyHighlight = useCallback(
    async (messageId: string, highlightedBy: string) => {
      await removeHighlight(messageId, highlightedBy);
      await refresh();
    },
    [refresh]
  );

  return { highlights, myHighlightedIds, toggleHighlight, removeAnyHighlight, refresh };
}
