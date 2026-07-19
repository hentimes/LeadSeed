import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectPresence } from '../services/presenceService';

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

    return connectPresence(user, (users) => {
      console.log('Presence Sync:', users);
      setOnlineUsers(users);
    });
  }, [user]);

  return <PresenceContext.Provider value={{ onlineUsers }}>{children}</PresenceContext.Provider>;
};

export const usePresence = () => useContext(PresenceContext);
