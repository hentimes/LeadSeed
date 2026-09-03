import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type PresenceStateUser = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  online_at: string;
};

const PRESENCE_TOPIC = 'online-users';

function isPresenceChannel(channel: RealtimeChannel): boolean {
  return channel.topic === `realtime:${PRESENCE_TOPIC}`;
}

async function removeStalePresenceChannels(): Promise<void> {
  const presenceChannels = supabase.getChannels().filter(isPresenceChannel);
  await Promise.all(presenceChannels.map((channel) => supabase.removeChannel(channel)));
}

export async function createPresenceChannel(userId: string): Promise<RealtimeChannel> {
  await removeStalePresenceChannels();
  return supabase.channel(PRESENCE_TOPIC, {
    config: { presence: { key: userId } },
  });
}

export async function trackPresence(
  channel: RealtimeChannel,
  user: User,
  profile?: { full_name?: string; avatar_url?: string }
): Promise<void> {
  await channel.track({
    id: user.id,
    email: user.email,
    full_name: profile?.full_name,
    avatar_url: profile?.avatar_url,
    online_at: new Date().toISOString(),
  });
}

export function readPresenceState(channel: RealtimeChannel): Record<string, PresenceStateUser[]> {
  return channel.presenceState<PresenceStateUser>();
}

export async function touchProfileLastSeen(userId: string, timestamp: string): Promise<void> {
  await supabase.from('profiles').update({ last_seen_at: timestamp }).eq('id', userId);
}

export async function disconnectPresenceChannel(channel: RealtimeChannel): Promise<void> {
  try {
    await channel.untrack();
  } catch {
    // noop
  }
  await supabase.removeChannel(channel);
}
