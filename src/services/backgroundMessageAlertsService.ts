import {
  fetchSenderName,
  isMyChatMessage,
  subscribeToChatReplies,
  subscribeToIncomingSupportMessages,
} from '../repositories/messageAlertsRepository';
import { getCurrentSession } from './authService';
import { dispatchAlert } from './alertNotifier';
import { incrementBadgeCount } from './extensionBadgeTheme';

function truncate(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

let unsubscribeSupport: (() => void) | null = null;
let unsubscribeChat: (() => void) | null = null;
let startPromise: Promise<void> | null = null;

async function startOnce(): Promise<void> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!userId) {
    startPromise = null;
    return;
  }

  stopMessageAlertsRuntime();

  unsubscribeSupport = subscribeToIncomingSupportMessages(userId, (row) => {
    void (async () => {
      const senderName = await fetchSenderName(row.sender_id);
      const result = await dispatchAlert('support_message', {
        id: `support-msg-${row.id}`,
        title: `Mensaje de ${senderName}`,
        message: truncate(row.message || ''),
      });
      // Solo suma si de verdad se aviso. Si la alerta esta desactivada o
      // suprimida por "solo con extension cerrada", el badge tampoco debe
      // contarla: seria un pendiente que el usuario nunca vio anunciarse.
      if (result.delivered) await incrementBadgeCount('messages');
    })();
  });

  unsubscribeChat = subscribeToChatReplies((row) => {
    void (async () => {
      // El propio autor no debe recibir alerta por responderse a si mismo.
      if (row.user_id === userId) return;
      if (!row.reply_to_id) return;

      const mine = await isMyChatMessage(row.reply_to_id, userId);
      if (!mine) return;

      const senderName = await fetchSenderName(row.user_id);
      const result = await dispatchAlert('chat_reply', {
        id: `chat-reply-${row.id}`,
        title: `${senderName} respondio tu mensaje`,
        message: truncate(row.content || ''),
      });
      if (result.delivered) await incrementBadgeCount('messages');
    })();
  });
}

export function startMessageAlertsRuntime(): Promise<void> {
  if (!startPromise) {
    startPromise = startOnce().catch((error) => {
      console.warn('[MessageAlerts] No se pudo iniciar:', error);
      startPromise = null;
    });
  }
  return startPromise;
}

export async function restartMessageAlertsRuntime(): Promise<void> {
  startPromise = null;
  stopMessageAlertsRuntime();
  await startMessageAlertsRuntime();
}

export function stopMessageAlertsRuntime(): void {
  unsubscribeSupport?.();
  unsubscribeSupport = null;
  unsubscribeChat?.();
  unsubscribeChat = null;
}
