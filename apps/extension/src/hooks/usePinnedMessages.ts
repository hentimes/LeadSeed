import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PIN_DURATION_HOURS,
  loadPinnedMessages,
  pinRoomMessage,
  subscribeToPinnedMessages,
  unpinRoomMessage,
} from '../services/chatService';
import type { ChatPinnedMessage } from '../types';

export function usePinnedMessages(roomId?: string) {
  const [pinned, setPinned] = useState<ChatPinnedMessage[]>([]);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    setPinned(await loadPinnedMessages(roomId));
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToPinnedMessages(roomId, () => void refresh());
  }, [roomId, refresh]);

  const pin = useCallback(
    async (messageId: string, pinnedBy: string, hours = DEFAULT_PIN_DURATION_HOURS) => {
      if (!roomId) return;
      await pinRoomMessage(messageId, roomId, pinnedBy, hours);
      await refresh();
    },
    [roomId, refresh]
  );

  const unpin = useCallback(
    async (messageId: string) => {
      await unpinRoomMessage(messageId);
      await refresh();
    },
    [refresh]
  );

  return { pinned, pin, unpin, refresh };
}
