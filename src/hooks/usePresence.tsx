import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectPresence } from '../services/presenceService';

export interface OnlineUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: Record<string, OnlineUser>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: {} });

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>({});

  const fullName = profile?.full_name;
  const avatarUrl = profile?.avatar_url;

  useEffect(() => {
    if (!user) {
      setOnlineUsers({});
      return;
    }

    return connectPresence(
      user,
      (users) => {
        setOnlineUsers(users);
      },
      { full_name: fullName, avatar_url: avatarUrl }
    );
  }, [user, fullName, avatarUrl]);

  return <PresenceContext.Provider value={{ onlineUsers }}>{children}</PresenceContext.Provider>;
};

export const usePresence = () => useContext(PresenceContext);
