import {
  fetchPendingAnnouncementsForAlerts,
  fetchSenderName,
  isMyChatMessage,
  subscribeToChatAnnouncements,
  subscribeToChatMentions,
  subscribeToChatReplies,
  subscribeToIncomingSupportMessages,
} from '../repositories/messageAlertsRepository';
import { getCurrentSession } from './authService';
import { dispatchAlert } from './alertNotifier';
import { incrementBadgeCount } from './extensionBadgeTheme';
import { toPlainText } from '../utils/mentionParser';

function truncate(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

let unsubscribeSupport: (() => void) | null = null;
let unsubscribeChat: (() => void) | null = null;
let unsubscribeMentions: (() => void) | null = null;
let unsubscribeAnnouncements: (() => void) | null = null;
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

  unsubscribeMentions = subscribeToChatMentions(userId, (row) => {
    void (async () => {
      const senderName = await fetchSenderName(row.user_id);
      const result = await dispatchAlert('chat_mention', {
        id: `chat-mention-${row.id}`,
        title: `${senderName} te mencionó`,
        message: truncate(toPlainText(row.content || '')),
      });
      if (result.delivered) await incrementBadgeCount('messages');
    })();
  });

  unsubscribeAnnouncements = subscribeToChatAnnouncements((row) => {
    void (async () => {
      if (row.user_id === userId) return;

      const senderName = await fetchSenderName(row.user_id);
      const result = await dispatchAlert('chat_announcement', {
        id: `chat-announcement-${row.id}`,
        title: `Anuncio de ${senderName}`,
        message: truncate(toPlainText(row.content || '')),
      });
      if (result.delivered) await incrementBadgeCount('messages');
    })();
  });

  // Anuncios que llegaron mientras la extension estaba cerrada: se avisan al
  // reconectar, con el mismo id que usaria el realtime (dispatchAlert/las
  // notificaciones de Chrome son idempotentes por id, asi que no duplican si
  // ya se habian mostrado).
  const pending = await fetchPendingAnnouncementsForAlerts();
  for (const row of pending) {
    if (row.user_id === userId) continue;

    const senderName = await fetchSenderName(row.user_id);
    const result = await dispatchAlert('chat_announcement', {
      id: `chat-announcement-${row.id}`,
      title: `Anuncio de ${senderName}`,
      message: truncate(toPlainText(row.content || '')),
    });
    if (result.delivered) await incrementBadgeCount('messages');
  }
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
  unsubscribeMentions?.();
  unsubscribeMentions = null;
  unsubscribeAnnouncements?.();
  unsubscribeAnnouncements = null;
}
