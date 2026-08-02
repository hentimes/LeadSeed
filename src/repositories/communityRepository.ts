import { supabase } from '../lib/supabaseClient';

export interface CommunitySenderProfileRow {
  full_name?: string | null;
  avatar_url?: string | null;
  show_premium_frame?: boolean | null;
}

export interface CommunityMessageRow {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  message: string;
  created_at: string;
  sender_profile?: CommunitySenderProfileRow | CommunitySenderProfileRow[];
}

const COMMUNITY_MESSAGE_SELECT =
  // sender_profile es una relacion calculada (migracion 059), no una FK. Se
  // embebe por el nombre de la funcion. No se puede apuntar a profiles_public
  // con un hint de FK porque internal_messages tiene dos claves hacia profiles
  // y PostgREST no puede desambiguar a traves de una vista.
  'id, sender_id, receiver_id, message, created_at, sender_profile(full_name, avatar_url, show_premium_frame)';

export async function fetchCommunityMessageRows(): Promise<CommunityMessageRow[]> {
  const { data, error } = await supabase
    .from('internal_messages')
    .select(COMMUNITY_MESSAGE_SELECT)
    .is('receiver_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data as CommunityMessageRow[];
}

export async function fetchCommunitySenderProfile(
  senderId: string
): Promise<CommunitySenderProfileRow | undefined> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('full_name, avatar_url, show_premium_frame')
    .eq('id', senderId)
    .single();

  if (error || !data) {
    return undefined;
  }

  return data as CommunitySenderProfileRow;
}

export async function insertCommunityMessage(senderId: string, message: string): Promise<void> {
  const { error } = await supabase.from('internal_messages').insert({
    sender_id: senderId,
    receiver_id: null,
    message,
  });

  if (error) {
    throw error;
  }
}

export function subscribeToCommunityMessageInserts(
  onInsert: (row: CommunityMessageRow) => void
): () => void {
  const channel = supabase
    .channel('public:internal_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, (payload) => {
      onInsert(payload.new as CommunityMessageRow);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
