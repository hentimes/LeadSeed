import { type Session, type Subscription, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar';

export interface GoogleOAuthFlowOptions {
  scopes?: string;
}

export async function startGoogleOAuthFlow(
  redirectTo: string,
  skipBrowserRedirect: boolean,
  options: GoogleOAuthFlowOptions = {}
): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: options.scopes?.trim() || DEFAULT_GOOGLE_SCOPES,
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

// ---------------------------------------------------------------------------
// Alta e inicio de sesion con correo y contrasena
// ---------------------------------------------------------------------------
//
// Todo lo de abajo usa codigos OTP de seis digitos, nunca enlaces. En una
// extension no existe URL que un correo pueda enlazar: `chrome-extension://` no
// es clicable desde el buzon y el dominio de `chrome.identity` solo intercepta
// un flujo que la propia extension abrio. Ademas `supabaseClient.ts` arranca con
// `detectSessionInUrl: false`, asi que un enlace no haria nada aunque llegase.
//
// Estas funciones siguen la regla del archivo: llamada cruda a Supabase y
// `throw` del error tal cual. Interpretar que significa cada fallo, y traducirlo
// al castellano, es trabajo de `authService`.

export interface EmailSignUpResponse {
  user: User | null;
  session: Session | null;
}

/**
 * Crea la cuenta. Con la confirmacion de correo activada NO devuelve sesion:
 * llega despues, al canjear el codigo en `verifyEmailOtp`.
 *
 * `metadata.full_name` no es decorativo. El trigger `handle_new_user` (migracion
 * 003) lee `raw_user_meta_data->>'full_name'` para rellenar `profiles`; sin este
 * dato el perfil nace sin nombre y el chat y la comunidad lo muestran vacio.
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  metadata: { full_name: string }
): Promise<EmailSignUpResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    throw error;
  }

  return { user: data.user, session: data.session };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('El servidor no devolvio una sesion.');
  }

  return data.session;
}

/**
 * Reenvia el codigo de alta.
 *
 * Solo sirve para cuentas existentes y **sin confirmar**. Sobre una ya
 * confirmada Supabase devuelve error, y eso es correcto: no hay nada que
 * confirmar.
 */
export async function sendSignUpOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });

  if (error) {
    throw error;
  }
}

/**
 * Pide el codigo para recuperar la contrasena.
 *
 * Ojo con lo que NO hace: no comprueba si la cuenta existe ni con que proveedor
 * entra. Responde igual siempre, y esa indiferencia es deliberada -es lo que
 * impide usar esta llamada para averiguar que correos estan registrados-. El
 * aviso de "esta cuenta usa Google" se da despues, ya con el codigo verificado.
 */
export async function sendPasswordRecoveryOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw error;
  }
}

/**
 * Canjea el codigo por una sesion.
 *
 * El tipo importa y no son intercambiables: `signup` confirma un alta reciente,
 * `recovery` autoriza el cambio de contrasena. Usar `email` en el alta falla si
 * el usuario nunca confirmo.
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  type: 'signup' | 'recovery'
): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('El codigo se acepto pero no llego la sesion.');
  }

  return data.session;
}

/** Requiere sesion activa. En la recuperacion la aporta `verifyEmailOtp`. */
export async function updateCurrentUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

/**
 * Proveedores con los que entra el usuario **actual**.
 *
 * No recibe un correo a proposito: la funcion SQL (migracion 111) lee
 * `auth.uid()`. Aceptar una direccion la convertiria en un oraculo para saber
 * que cuentas existen, y la anon key viaja publica dentro del bundle.
 */
export async function fetchCurrentUserAuthProviders(): Promise<string[]> {
  const { data, error } = await supabase.rpc('current_user_auth_providers');

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as string[]) : [];
}
