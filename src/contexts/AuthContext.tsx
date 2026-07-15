import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
  loading: boolean;
  activeFeatures: string[];
  hasFeature: (feat: string) => boolean;
  refreshProfile: () => Promise<void>;
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
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_features');
      if (error) throw error;
      setActiveFeatures(data || []);
    } catch (err) {
      console.error('Error fetching user features:', err);
      setActiveFeatures([]);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthContext - getSession:', session, error);
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        loadFeatures();
      } else {
        setActiveFeatures([]);
        setProfile(null);
        setLoading(false);
      }
    });

    // Escuchar cambios en la autenticación (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext - onAuthStateChange event:', _event, 'session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        loadFeatures();
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

  // Cargar perfil una vez que tenemos el user (y refrescar si cambia)
  useEffect(() => {
    if (user) {
      refreshProfile().finally(() => setLoading(false));
    }
  }, [user]);

  const signOut = async () => {
    setActiveFeatures([]);
    setProfile(null);
    await supabase.auth.signOut();
  };

  const hasFeature = (feat: string) => {
    if (user?.email === 'planespro.cl@gmail.com') return true;
    return activeFeatures.includes(feat);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, loading, activeFeatures, hasFeature, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
