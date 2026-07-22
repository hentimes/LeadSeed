import type { Session } from '@supabase/supabase-js';
import {
  fetchCurrentSession,
  persistOAuthSession,
  persistGoogleCalendarConnection,
  signOutCurrentSession,
  startGoogleOAuthFlow,
  subscribeToAuthChanges,
} from '../repositories/authRepository';

interface OAuthCallbackTokens {
  accessToken: string;
  refreshToken: string;
  providerToken?: string;
  providerRefreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

function optionalParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value && value.trim() ? value.trim() : undefined;
}

function extractTokensFromCallbackUrl(callbackUrl: string): OAuthCallbackTokens {
  const url = new URL(callbackUrl);
  const hash = url.hash;

  if (!hash) {
    throw new Error('Falta el hash en la URL de respuesta.');
  }

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const oauthError = params.get('error_description');

  if (oauthError) {
    throw new Error(`Error OAuth devuelto por Google: ${oauthError}`);
  }

  if (!accessToken || !refreshToken) {
    throw new Error('Faltan tokens en el hash de la respuesta.');
  }

  return {
    accessToken,
    refreshToken,
    providerToken: optionalParam(params, 'provider_token'),
    providerRefreshToken: optionalParam(params, 'provider_refresh_token'),
    expiresIn: Number(optionalParam(params, 'expires_in') || 0) || undefined,
    scope: optionalParam(params, 'scope'),
  };
}

export interface BeginGoogleLoginOptions {
  scopes?: string;
}

export async function beginGoogleLogin(
  redirectUrl: string,
  isExtension: boolean,
  options: BeginGoogleLoginOptions = {}
): Promise<string | null> {
  return startGoogleOAuthFlow(redirectUrl, isExtension, options);
}

export async function completeGoogleExtensionLogin(callbackUrl: string): Promise<void> {
  const { accessToken, refreshToken, providerToken, providerRefreshToken, expiresIn, scope } = extractTokensFromCallbackUrl(callbackUrl);
  await persistOAuthSession(accessToken, refreshToken);
  if (providerToken || providerRefreshToken) {
    await persistGoogleCalendarConnection(accessToken, providerToken || '', providerRefreshToken, expiresIn, scope);
  }
}

export async function getCurrentSession() {
  return fetchCurrentSession();
}

export function onAuthSessionChange(callback: Parameters<typeof subscribeToAuthChanges>[0]) {
  return subscribeToAuthChanges(callback);
}

export async function logoutCurrentUser(): Promise<void> {
  await signOutCurrentSession();
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const session = await fetchCurrentSession();
  return session?.access_token ?? null;
}

export async function persistGoogleCalendarConnectionFromSession(session: Session | null): Promise<void> {
  if (!session?.access_token) return;

  const providerSession = session as Session & {
    provider_token?: string;
    provider_refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!providerSession.provider_token && !providerSession.provider_refresh_token) return;

  await persistGoogleCalendarConnection(
    session.access_token,
    providerSession.provider_token || '',
    providerSession.provider_refresh_token,
    providerSession.expires_in,
    providerSession.scope
  );
}

export function mapSessionToUser(session: Session | null) {
  return session?.user ?? null;
}
