import { supabase } from '../lib/supabaseClient';

export interface SupportMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
}

export function subscribeToIncomingSupportMessages(
  userId: string,
  onMessage: (row: SupportMessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`support_msgs_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'internal_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => onMessage(payload.new as SupportMessageRow),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Realtime no permite filtrar por join, y lo que importa no es el mensaje
 * sino a quien responde. Se escuchan los INSERT con reply_to_id y el
 * llamador resuelve la pertenencia con isMyChatMessage.
 */
export function subscribeToChatReplies(onReply: (row: ChatMessageRow) => void): () => void {
  const channel = supabase
    .channel('chat_replies')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        const row = payload.new as ChatMessageRow;
        if (row.reply_to_id) onReply(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Mensajes de sala que mencionan al usuario. La mencion viaja dentro del texto
 * como @[etiqueta](user:UUID), asi que Realtime no puede filtrarla server-side
 * y se resuelve buscando el propio identificador en el contenido.
 */
export function subscribeToChatMentions(
  userId: string,
  onMention: (row: ChatMessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`chat_mentions_${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        const row = payload.new as ChatMessageRow;
        if (row.user_id === userId) return;
        if (row.content?.includes(`(user:${userId})`)) onMention(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function isMyChatMessage(messageId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('user_id')
    .eq('id', messageId)
    .maybeSingle();

  if (error || !data) return false;
  return data.user_id === userId;
}

export async function fetchSenderName(userId: string): Promise<string> {
  const { data } = await supabase.from('profiles_public').select('full_name').eq('id', userId).maybeSingle();
  return data?.full_name || 'Alguien';
}
