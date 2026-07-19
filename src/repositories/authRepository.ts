import { type Session, type Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export async function startGoogleOAuthFlow(redirectTo: string, skipBrowserRedirect: boolean): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'https://www.googleapis.com/auth/calendar',
      skipBrowserRedirect,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data.url ?? null;
}

export async function persistOAuthSession(accessToken: string, refreshToken: string): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }
}

export async function persistGoogleCalendarConnection(
  accessToken: string,
  providerToken: string,
  providerRefreshToken?: string,
  expiresIn?: number,
  scope?: string
): Promise<void> {
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-connect`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider_token: providerToken,
      provider_refresh_token: providerRefreshToken || null,
      expires_in: expiresIn || null,
      scope: scope || null,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'No se pudo guardar la conexion con Google Calendar';
    throw new Error(message);
  }
}

export async function fetchCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(
  callback: (event: string, session: Session | null) => void
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
}

export async function signOutCurrentSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
