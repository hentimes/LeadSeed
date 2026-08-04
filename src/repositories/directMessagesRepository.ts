import { supabase } from '../lib/supabaseClient';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const DM_SELECT = 'id, sender_id, receiver_id, message, is_read, created_at';
const HISTORY_LIMIT = 100;

/**
 * Conversacion privada entre dos personas. Se apoya en internal_messages, la
 * misma tabla del soporte 1-a-1: sus politicas ya permiten leer solo lo que uno
 * envio o recibio, que es exactamente lo que necesita un mensaje directo.
 */
export async function fetchConversation(
  userId: string,
  otherUserId: string
): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('internal_messages')
    .select(DM_SELECT)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order('created_at')
    .limit(HISTORY_LIMIT);

  if (error || !data) return [];
  return data as DirectMessage[];
}

export async function insertDirectMessage(
  senderId: string,
  receiverId: string,
  message: string
): Promise<void> {
  const { error } = await supabase.from('internal_messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message,
  });

  if (error) throw error;
}

export async function markConversationRead(userId: string, otherUserId: string): Promise<void> {
  await supabase
    .from('internal_messages')
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
        table: 'internal_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as DirectMessage;
        if (row.sender_id === otherUserId) onMessage(row);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
