import { useCallback, useRef, useState } from 'react';
import { checkMessage, registerSend } from '../services/chatModeration';

/**
 * Aplica las reglas anti-spam a un composer. Guarda el historial reciente de
 * envios en refs porque solo interesa para decidir el proximo envio, no para
 * pintar nada.
 */
export function useMessageGuard() {
  const timestamps = useRef<number[]>([]);
  const lastMessage = useRef<string | undefined>(undefined);
  const [blockedReason, setBlockedReason] = useState('');

  const verify = useCallback((content: string): boolean => {
    const result = checkMessage(content, {
      recentTimestamps: timestamps.current,
      lastMessage: lastMessage.current,
    });

    setBlockedReason(result.ok ? '' : result.reason || 'No se pudo enviar el mensaje.');
    return result.ok;
  }, []);

  const confirmSent = useCallback((content: string) => {
    timestamps.current = registerSend(timestamps.current);
    lastMessage.current = content;
  }, []);

  const clearBlock = useCallback(() => setBlockedReason(''), []);

  return { blockedReason, verify, confirmSent, clearBlock };
}
