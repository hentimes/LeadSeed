import { supabase } from '../lib/supabaseClient';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const DM_SELECT = 'id, sender_id, receiver_id, content, is_read, created_at';
const HISTORY_LIMIT = 100;

// La columna real es "content" (mismo nombre que chat_messages), pero el resto
// del cliente ya conocia esta forma como "message" desde que los DM vivian en
// internal_messages. Se mapea aca para no tener que renombrar en cascada.
function mapRow(row: { content: string } & Omit<DirectMessage, 'message'>): DirectMessage {
  const { content, ...rest } = row;
  return { ...rest, message: content };
}

/**
 * Conversacion privada entre dos personas, en su propia tabla
 * (chat_direct_messages). No comparte espacio con internal_messages, que
 * sigue siendo solo para la mensajeria de soporte -- antes ambas features
 * usaban la misma tabla y los DM aparecian mezclados en la bandeja de soporte
 * del admin.
 */
export async function fetchConversation(
  userId: string,
  otherUserId: string
): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('chat_direct_messages')
    .select(DM_SELECT)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order('created_at')
    .limit(HISTORY_LIMIT);

  if (error) {
    console.error('[dm] fetchConversation', error);
    return [];
  }
  return (data as unknown as ({ content: string } & Omit<DirectMessage, 'message'>)[]).map(mapRow);
}

export async function insertDirectMessage(
  senderId: string,
  receiverId: string,
  message: string
): Promise<void> {
  const { error } = await supabase.from('chat_direct_messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content: message,
  });

  if (error) throw error;
}

export async function markConversationRead(userId: string, otherUserId: string): Promise<void> {
  await supabase
    .from('chat_direct_messages')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false);
}

/** Mensajes que me llegan de una persona concreta, en vivo. */
export function subscribeToConversation(
  userId: string,
  otherUserId: string,
  onMessage: (message: DirectMessage) => void
): () => void {
  const channel = supabase
    .channel(`dm:${userId}:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { content: string } & Omit<DirectMessage, 'message'>;
        if (row.sender_id === otherUserId) onMessage(mapRow(row));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Cualquier DM entrante, sin importar quien lo manda. Alimenta la franja de
 * sesiones de DM (avatares en la barra superior del chat): asi se puede saber
 * que alguien escribio sin tener su conversacion abierta.
 */
export function subscribeToAnyIncomingDirectMessage(
  userId: string,
  onMessage: (message: DirectMessage) => void
): () => void {
  const channel = supabase
    .channel(`dm-inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { content: string } & Omit<DirectMessage, 'message'>;
        onMessage(mapRow(row));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function fetchUnreadDirectMessageCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('chat_direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error || count === null) return 0;
  return count;
}
