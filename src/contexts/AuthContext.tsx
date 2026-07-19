import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { getCurrentSession, logoutCurrentUser, mapSessionToUser, onAuthSessionChange, persistGoogleCalendarConnectionFromSession } from '../services/authService';
import { loadActiveFeatures, loadUserProfile } from '../services/profileService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
  loading: boolean;
  activeFeatures: string[];
  hasFeature: (feat: string) => boolean;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  signOut: async () => {},
  loading: true,
  activeFeatures: [],
  hasFeature: () => false,
  refreshProfile: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);

  const loadFeatures = async () => {
    setActiveFeatures(await loadActiveFeatures());
  };

  const refreshProfile = async (targetUserId = user?.id) => {
    if (!targetUserId) return;
    const nextProfile = await loadUserProfile(targetUserId);
    if (nextProfile) {
      setProfile(nextProfile);
    }
  };

  useEffect(() => {
    getCurrentSession().then((nextSession) => {
      console.log('AuthContext - getSession:', nextSession);
      setSession(nextSession);
      setUser(mapSessionToUser(nextSession));
      if (nextSession) {
        void persistGoogleCalendarConnectionFromSession(nextSession).catch((error) => {
          console.warn('No se pudo guardar la conexion Google Calendar:', error);
        });
        void loadFeatures();
      } else {
        setActiveFeatures([]);
        setProfile(null);
        setLoading(false);
      }
    });

    const subscription = onAuthSessionChange((event, nextSession) => {
      console.log('AuthContext - onAuthStateChange event:', event, 'session:', nextSession);
      setSession(nextSession);
      setUser(mapSessionToUser(nextSession));
      if (nextSession) {
        void persistGoogleCalendarConnectionFromSession(nextSession).catch((error) => {
          console.warn('No se pudo guardar la conexion Google Calendar:', error);
        });
        void loadFeatures();
      } else {
        setActiveFeatures([]);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile(user.id).finally(() => setLoading(false));
    }
  }, [user]);

  const signOut = async () => {
    setActiveFeatures([]);
    setProfile(null);
    await logoutCurrentUser();
  };

  const isAdmin = profile?.role === 'admin';

  const hasFeature = (feat: string) => {
    if (isAdmin) return true;
    return activeFeatures.includes(feat);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, loading, activeFeatures, hasFeature, refreshProfile: () => refreshProfile(), isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
