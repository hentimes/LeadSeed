import type { User } from '@supabase/supabase-js';
import {
  createPresenceChannel,
  disconnectPresenceChannel,
  readPresenceState,
  touchProfileLastSeen,
  trackPresence,
  type PresenceStateUser,
} from '../repositories/presenceRepository';

export type OnlineUsersMap = Record<string, PresenceStateUser>;

function mapPresenceStateToUsersMap(state: Record<string, PresenceStateUser[]>): OnlineUsersMap {
  const users: OnlineUsersMap = {};

  for (const [key, presences] of Object.entries(state)) {
    if (presences.length > 0) {
      users[key] = presences[0];
    }
  }

  return users;
}

export function connectPresence(
  user: User,
  onSync: (users: OnlineUsersMap) => void,
  profile?: { full_name?: string; avatar_url?: string }
): () => void {
  let disposed = false;
  let channel: Awaited<ReturnType<typeof createPresenceChannel>> | null = null;

  void createPresenceChannel(user.id).then((nextChannel) => {
    if (disposed) {
      void disconnectPresenceChannel(nextChannel);
      return;
    }

    channel = nextChannel;

    nextChannel
      .on('presence', { event: 'sync' }, () => {
        onSync(mapPresenceStateToUsersMap(readPresenceState(nextChannel)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const timestamp = new Date().toISOString();
            await trackPresence(nextChannel, user, profile);
            await touchProfileLastSeen(user.id, timestamp);
          } catch (error) {
            console.error('Error tracking presence:', error);
          }
        }
      });
  }).catch((error) => {
    console.error('Error creating presence channel:', error);
  });

  return () => {
    disposed = true;
    if (channel) {
      void disconnectPresenceChannel(channel);
    }
  };
}
