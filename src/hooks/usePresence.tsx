import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface OnlineUser {
  id: string;
  email: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: Record<string, OnlineUser>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: {} });

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>({});

  useEffect(() => {
    if (!user) {
      setOnlineUsers({});
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineUser>();
        const users: Record<string, OnlineUser> = {};
        for (const [key, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            users[key] = presences[0];
          }
        }
        console.log('Presence Sync:', users);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        console.log('Presence Status:', status);
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              id: user.id,
              email: user.email,
              online_at: new Date().toISOString(),
            });
            await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
          } catch (e) {
            console.error('Error tracking presence:', e);
          }
        }
      });

    return () => {
      channel.untrack();
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
