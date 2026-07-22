import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { getCurrentSession, logoutCurrentUser, mapSessionToUser, onAuthSessionChange, persistGoogleCalendarConnectionFromSession } from '../services/authService';
import { loadActiveFeatures, loadUserProfile } from '../services/profileService';
import { supabase } from '../lib/supabaseClient';

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
  const requestVersionRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);

  const loadFeatures = async (requestVersion: number) => {
    const nextFeatures = await loadActiveFeatures();
    if (requestVersionRef.current !== requestVersion) return;
    setActiveFeatures(nextFeatures);
  };

  const refreshProfile = async (targetUserId = user?.id) => {
    if (!targetUserId) return;
    const nextProfile = await loadUserProfile(targetUserId);
    if (requestVersionRef.current === 0) return;
    setProfile(nextProfile);
    if (targetUserId === user?.id) {
      await loadFeatures(requestVersionRef.current);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const syncSession = (nextSession: Session | null) => {
      if (cancelled) return;
      const nextUser = mapSessionToUser(nextSession);
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setSession(nextSession);
      sessionRef.current = nextSession;
      setUser(nextUser);
      setLoading(false);

      if (nextSession && nextUser) {
        void persistGoogleCalendarConnectionFromSession(nextSession).catch((error) => {
          console.warn('No se pudo guardar la conexion Google Calendar:', error);
        });
        void loadFeatures(requestVersion).catch(() => {
          if (requestVersionRef.current !== requestVersion) return;
          setActiveFeatures([]);
        });
        void loadUserProfile(nextUser.id)
          .then((nextProfile) => {
            if (requestVersionRef.current !== requestVersion) return;
            setProfile(nextProfile);
          })
          .catch(() => {
            if (requestVersionRef.current !== requestVersion) return;
            setProfile(null);
          });
      } else {
        setActiveFeatures([]);
        setProfile(null);
      }
    };

    getCurrentSession()
      .then(syncSession)
      .catch(() => {
        if (cancelled) return;
        requestVersionRef.current += 1;
        setSession(null);
        setUser(null);
        setProfile(null);
        setActiveFeatures([]);
        setLoading(false);
      });

    const subscription = onAuthSessionChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION' && sessionRef.current === nextSession) return;
      syncSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`auth_entitlements_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const nextProfile = payload.new as Profile;
          setProfile((currentProfile) => (currentProfile ? { ...currentProfile, ...nextProfile } : nextProfile));
          void loadFeatures(requestVersionRef.current).catch(() => undefined);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_feature_overrides', filter: `user_id=eq.${user.id}` },
        () => {
          void loadFeatures(requestVersionRef.current).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !profile?.plan_id) return;

    const channel = supabase
      .channel(`auth_plan_features_${user.id}_${profile.plan_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_features', filter: `plan_id=eq.${profile.plan_id}` },
        () => {
          void loadFeatures(requestVersionRef.current).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.plan_id, user?.id]);

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
