import { supabase } from '../lib/supabaseClient';
import type { ChatMessage } from '../types';

export interface ChatMessageReport {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  message?: ChatMessage;
  reporter?: { full_name?: string; avatar_url?: string };
}

// --- Bloqueos ---------------------------------------------------------------

export async function fetchBlockedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  if (error) {
    console.error('[moderation] fetchBlockedUserIds', error);
    return [];
  }
  return data.map((row) => (row as { blocked_id: string }).blocked_id);
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

// --- Silencios ---------------------------------------------------------------

export async function fetchMutedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_user_mutes')
    .select('muted_id')
    .eq('muter_id', userId);

  if (error) {
    console.error('[moderation] fetchMutedUserIds', error);
    return [];
  }
  return data.map((row) => (row as { muted_id: string }).muted_id);
}

export async function muteUser(muterId: string, mutedId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_user_mutes')
    .insert({ muter_id: muterId, muted_id: mutedId });

  if (error && error.code !== '23505') throw error;
}

export async function unmuteUser(muterId: string, mutedId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_user_mutes')
    .delete()
    .eq('muter_id', muterId)
    .eq('muted_id', mutedId);

  if (error) throw error;
}

// --- Reportes ---------------------------------------------------------------

// Mismo motivo que USER_PROFILE_EMBED en chatRepository: hay que nombrar la
// FK exacta o PostgREST no sabe por cual camino embeber profiles_public.
const REPORT_SELECT =
  'id, message_id, reporter_id, reason, status, created_at, ' +
  'message:chat_messages(id, room_id, user_id, content, created_at, is_announcement, user_profile:profiles_public!chat_messages_user_id_fkey(*)), ' +
  'reporter:profiles_public!chat_message_reports_reporter_id_fkey(full_name, avatar_url)';

export async function reportMessage(
  messageId: string,
  reporterId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_message_reports')
    .insert({ message_id: messageId, reporter_id: reporterId, reason: reason || null });

  if (error && error.code !== '23505') throw error;
}

export async function fetchPendingReports(): Promise<ChatMessageReport[]> {
  const { data, error } = await supabase
    .from('chat_message_reports')
    .select(REPORT_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[moderation] fetchPendingReports', error);
    return [];
  }
  return data as unknown as ChatMessageReport[];
}

export async function fetchPendingReportCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_chat_reports');
  if (error || typeof data !== 'number') return 0;
  return data;
}

export async function resolveReport(
  reportId: string,
  resolvedBy: string,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  const { error } = await supabase
    .from('chat_message_reports')
    .update({ status, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) throw error;
}

export async function deleteReportedMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
  if (error) throw error;
}

// --- Baneos -------------------------------------------------------------

export interface ChatUserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  banned_until: string | null;
  created_at: string;
  lifted_at: string | null;
}

/** Baneo activo del usuario actual, o null si no tiene. */
export async function fetchMyActiveChatBan(): Promise<ChatUserBan | null> {
  const { data, error } = await supabase.rpc('fetch_my_active_chat_ban');
  if (error || !data || !(data as ChatUserBan).id) return null;
  return data as ChatUserBan;
}

export async function fetchActiveBans(): Promise<ChatUserBan[]> {
  const { data, error } = await supabase
    .from('chat_user_bans')
    .select('id, user_id, banned_by, reason, banned_until, created_at, lifted_at')
    .is('lifted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[moderation] fetchActiveBans', error);
    return [];
  }
  // banned_until vencido no cuenta como activo, aunque nadie lo haya levantado.
  const now = Date.now();
  return (data as ChatUserBan[]).filter(
    (ban) => !ban.banned_until || new Date(ban.banned_until).getTime() > now
  );
}

export async function banUser(
  userId: string,
  bannedBy: string,
  reason: string,
  bannedUntil: string | null
): Promise<void> {
  const { error } = await supabase
    .from('chat_user_bans')
    .insert({ user_id: userId, banned_by: bannedBy, reason: reason || null, banned_until: bannedUntil });

  if (error) throw error;
}

export async function liftBan(banId: string, liftedBy: string): Promise<void> {
  const { error } = await supabase
    .from('chat_user_bans')
    .update({ lifted_at: new Date().toISOString(), lifted_by: liftedBy })
    .eq('id', banId);

  if (error) throw error;
}

// --- Destacados -----------------------------------------------------------

export interface ChatHighlightedMessage {
  message_id: string;
  room_id: string;
  highlighted_by: string;
  created_at: string;
  message?: ChatMessage;
  highlighter?: { full_name?: string };
}

const HIGHLIGHT_SELECT =
  'message_id, room_id, highlighted_by, created_at, ' +
  'message:chat_messages(id, room_id, user_id, content, created_at, is_announcement, user_profile:profiles_public!chat_messages_user_id_fkey(*)), ' +
  'highlighter:profiles_public!chat_highlighted_messages_highlighted_by_fkey(full_name)';

export async function fetchHighlightedMessages(roomId: string): Promise<ChatHighlightedMessage[]> {
  const { data, error } = await supabase
    .from('chat_highlighted_messages')
    .select(HIGHLIGHT_SELECT)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[moderation] fetchHighlightedMessages', error);
    return [];
  }
  return data as unknown as ChatHighlightedMessage[];
}

export async function fetchMyHighlightedMessageIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_highlighted_messages')
    .select('message_id')
    .eq('highlighted_by', userId);

  if (error) return [];
  return data.map((row) => (row as { message_id: string }).message_id);
}

export async function highlightMessage(
  messageId: string,
  roomId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_highlighted_messages')
    .insert({ message_id: messageId, room_id: roomId, highlighted_by: userId });

  if (error && error.code !== '23505') throw error;
}

/**
 * Borra la fila exacta (mensaje + quien lo destaco). No es "el usuario actual
 * saca SU destacado": la RLS ya permite que el propio highlighted_by o
 * cualquier staff la borren, asi que el segundo parametro es siempre el
 * autor original del destacado, no quien ejecuta la accion.
 */
export async function removeHighlight(messageId: string, highlightedBy: string): Promise<void> {
  const { error } = await supabase
    .from('chat_highlighted_messages')
    .delete()
    .eq('message_id', messageId)
    .eq('highlighted_by', highlightedBy);

  if (error) throw error;
}
