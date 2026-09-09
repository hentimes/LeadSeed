import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { getCurrentSession, logoutCurrentUser, mapSessionToUser, onAuthSessionChange, persistGoogleCalendarConnectionFromSession } from '../services/authService';
import { loadActiveFeatures, loadUserProfile } from '../services/profileService';
import { subscribeToUserUpdates, subscribeToPlanUpdates } from '../repositories/authRealtimeRepository';

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

  /* Estables las dos: son dependencia del valor del contexto, y recrearlas en
     cada render anularia su memo -que es justo lo que vino a arreglarse-. */
  const loadFeatures = useCallback(async (requestVersion: number) => {
    const nextFeatures = await loadActiveFeatures();
    if (requestVersionRef.current !== requestVersion) return;
    setActiveFeatures(nextFeatures);
  }, []);

  const refreshProfile = useCallback(async (targetUserId = user?.id) => {
    if (!targetUserId) return;
    const nextProfile = await loadUserProfile(targetUserId);
    if (requestVersionRef.current === 0) return;
    setProfile(nextProfile);
    if (targetUserId === user?.id) {
      await loadFeatures(requestVersionRef.current);
    }
  }, [user?.id, loadFeatures]);

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
          console.warn('No se pudo guardar la conexión Google Calendar:', error);
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
    /* `loadFeatures` es estable (`useCallback` sin dependencias), asi que
       declararla no reabre la suscripcion en cada render. */
  }, [loadFeatures]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToUserUpdates(
      user.id,
      (nextProfile) => {
        setProfile((currentProfile) => (currentProfile ? { ...currentProfile, ...nextProfile } : nextProfile));
        void loadFeatures(requestVersionRef.current).catch(() => undefined);
      },
      () => {
        void loadFeatures(requestVersionRef.current).catch(() => undefined);
      }
    );
  }, [user?.id, loadFeatures]);

  useEffect(() => {
    if (!user?.id || !profile?.plan_id) return;

    return subscribeToPlanUpdates(
      user.id,
      profile.plan_id,
      () => {
        void loadFeatures(requestVersionRef.current).catch(() => undefined);
      }
    );
  }, [profile?.plan_id, user?.id, loadFeatures]);

  /* Estable: es dependencia del valor del contexto, y recrearla en cada render
     anularia el memo de abajo. */
  const signOut = useCallback(async () => {
    setActiveFeatures([]);
    setProfile(null);
    await logoutCurrentUser();
  }, []);

  const isAdmin = profile?.role === 'admin';

  const hasFeature = useCallback(
    (feat: string) => (isAdmin ? true : activeFeatures.includes(feat)),
    [isAdmin, activeFeatures],
  );

  /*
   * EL VALOR DEL CONTEXTO VA MEMOIZADO.
   *
   * Era un objeto literal, o sea uno nuevo en cada render de este proveedor.
   * `useAuth()` lo consume casi toda la aplicacion -Leads, Pipeline, Tareas,
   * Listas, Comunidad-, asi que cualquier cambio de perfil o de plan, incluidos
   * los que llegan solos por realtime desde otra pestaña, repintaba entera
   * cualquier pantalla abierta aunque el dato que esa pantalla mira no hubiera
   * cambiado.
   *
   * `refreshProfile` se envuelve para no exponer el parametro interno, y esa
   * envoltura tambien tenia que dejar de recrearse en cada render.
   */
  const refrescar = useCallback(() => refreshProfile(), [refreshProfile]);

  const valor = useMemo(
    () => ({
      session,
      user,
      profile,
      signOut,
      loading,
      activeFeatures,
      hasFeature,
      refreshProfile: refrescar,
      isAdmin,
    }),
    [session, user, profile, signOut, loading, activeFeatures, hasFeature, refrescar, isAdmin],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
