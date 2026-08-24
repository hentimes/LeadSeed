import type { Session } from '@supabase/supabase-js';
import {
  fetchCurrentSession,
  fetchCurrentUserAuthProviders,
  persistOAuthSession,
  persistGoogleCalendarConnection,
  sendPasswordRecoveryOtp,
  sendSignUpOtp,
  signInWithEmailPassword,
  signOutCurrentSession,
  signUpWithEmailPassword,
  startGoogleOAuthFlow,
  subscribeToAuthChanges,
  updateCurrentUserPassword,
  verifyEmailOtp,
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

// ---------------------------------------------------------------------------
// Alta e inicio de sesion con correo y contrasena
// ---------------------------------------------------------------------------
//
// Dos reglas gobiernan todo lo que sigue. Las dos son decisiones tomadas, no
// preferencias de estilo, y romperlas reabre agujeros concretos:
//
// 1. NO SE REVELA SI UN CORREO EXISTE. Ni al entrar, ni al registrarse, ni al
//    pedir recuperacion. La anon key viaja publica dentro del bundle de la
//    extension, asi que cualquiera podria recorrer direcciones y quedarse con
//    la lista de clientes. Por eso "correo desconocido" y "contrasena
//    equivocada" comparten mensaje: no es pereza, es el objetivo.
//
// 2. EL AVISO DE "ESTA CUENTA USA GOOGLE" SE DA DESPUES DE VERIFICAR EL CODIGO.
//    Antes seria justo la fuga que evita la regla 1. Despues no revela nada:
//    quien acerto el codigo ya demostro que el buzon es suyo.
//
// La regla 2 ademas cierra un agujero que no se ve a simple vista.
// resetPasswordForEmail sobre una cuenta que solo entra con Google envia el
// codigo igualmente, y updateUser despues le pondria contrasena. Eso es
// vincular identidades por la puerta de atras, justo lo que se decidio no hacer.
// completePasswordRecovery lo corta comprobando los proveedores entre el
// verifyOtp y el cambio de contrasena.

export interface EmailSignUpRequest {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Un unico desenlace posible a proposito.
 *
 * Cuando el correo ya tiene cuenta, Supabase responde 200 con identities vacio
 * en vez de un error: es su mecanismo antienumeracion. Se podria detectar y
 * avisar, y se decidio no hacerlo, porque seria la fuga de la regla 1. El
 * usuario ve "revisa tu correo" en ambos casos, y la pantalla del codigo le
 * ofrece la salida ("si no llega, quiza ya tengas cuenta") sin confirmarle nada.
 */
export type SignUpResult = { status: 'otp_enviado' };

export type PasswordLoginResult =
  | { status: 'ok' }
  | { status: 'pendiente_verificacion' };

export type RecoveryStartResult = { status: 'otp_enviado' };

export type RecoveryFinishResult =
  | { status: 'ok' }
  | { status: 'cuenta_google' };

/** Codigo de error de Supabase, que no viaja dentro del message. */
function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

/**
 * Traduce el fallo al castellano.
 *
 * Existe porque los mensajes de Supabase vienen en ingles y porque algunos
 * delatan mas de la cuenta. Nunca se deja pasar el message crudo a la interfaz:
 * getErrorMessage sirve para errores que ya sabemos inocuos, no para los de
 * autenticacion.
 */
function authErrorMessage(error: unknown, fallback: string): string {
  switch (errorCode(error)) {
    case 'invalid_credentials':
      // Deliberadamente ambiguo: cubre "no existe" y "contrasena mal" con el
      // mismo texto. Ver regla 1.
      return 'Correo o contrasena incorrectos.';
    case 'email_not_confirmed':
      return 'Todavia no confirmaste tu correo.';
    case 'otp_expired':
      return 'Ese codigo ya caduco. Pide uno nuevo.';
    case 'invalid_otp':
      return 'El codigo no es correcto.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Espera un minuto antes de pedir otro codigo.';
    case 'weak_password':
      return 'Esa contrasena es demasiado debil.';
    case 'same_password':
      return 'La contrasena nueva es igual a la anterior.';
    case 'signup_disabled':
      return 'El registro esta cerrado por ahora.';
    default:
      return fallback;
  }
}

export async function beginEmailSignUp(request: EmailSignUpRequest): Promise<SignUpResult> {
  try {
    await signUpWithEmailPassword(request.email.trim(), request.password, {
      full_name: request.fullName.trim(),
    });
  } catch (error) {
    throw new Error(authErrorMessage(error, 'No se pudo crear la cuenta.'), { cause: error });
  }

  return { status: 'otp_enviado' };
}

export async function confirmEmailSignUp(email: string, code: string): Promise<void> {
  try {
    await verifyEmailOtp(email.trim(), code, 'signup');
  } catch (error) {
    throw new Error(authErrorMessage(error, 'No se pudo verificar el codigo.'), { cause: error });
  }
}

/**
 * Reenvia el codigo de alta sin delatar el estado de la cuenta.
 *
 * `auth.resend({ type: 'signup' })` solo termina bien sobre una cuenta que
 * existe y NO esta confirmada. Es decir, que la llamada funcione o falle es en
 * si misma una señal: sirve para averiguar que direcciones tienen un alta a
 * medias, y se puede lanzar contra el endpoint publico con la anon key sin
 * pasar por esta interfaz. Por eso se traga todo salvo el exceso de envios,
 * igual que `beginPasswordRecovery`.
 */
export async function resendSignUpCode(email: string): Promise<void> {
  try {
    await sendSignUpOtp(email.trim());
  } catch (error) {
    const code = errorCode(error);
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
      throw new Error(authErrorMessage(error, 'Espera un minuto antes de pedir otro codigo.'), {
        cause: error,
      });
    }
    // El resto se traga a proposito. Se registra el codigo -nunca el correo-
    // para poder distinguir una caida real del envio de un rechazo esperado.
    console.warn('[Auth] Reenvio de codigo no completado:', code || 'sin codigo');
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<PasswordLoginResult> {
  try {
    await signInWithEmailPassword(email.trim(), password);
    return { status: 'ok' };
  } catch (error) {
    // Cuenta creada pero sin confirmar: no es un fallo del usuario, es un flujo
    // a medias. Se le lleva a escribir el codigo en vez de darle un error.
    if (errorCode(error) === 'email_not_confirmed') {
      return { status: 'pendiente_verificacion' };
    }
    throw new Error(authErrorMessage(error, 'No se pudo iniciar sesion.'), { cause: error });
  }
}

/**
 * Siempre responde lo mismo, exista o no la cuenta. Ver regla 1.
 *
 * El unico error que se propaga es el de exceso de envios, porque ese si lo
 * causo el propio usuario pulsando de mas y necesita saberlo.
 */
export async function beginPasswordRecovery(email: string): Promise<RecoveryStartResult> {
  try {
    await sendPasswordRecoveryOtp(email.trim());
  } catch (error) {
    const code = errorCode(error);
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
      throw new Error(authErrorMessage(error, 'Espera un minuto antes de pedir otro codigo.'), { cause: error });
    }
    // Cualquier otro fallo se traga a proposito: distinguirlos revelaria si la
    // cuenta existe. Se registra solo el codigo, nunca el correo, porque sin
    // ninguna señal una caida real del envio de correo seria invisible: el
    // usuario seguiria viendo "te enviamos un codigo" para siempre.
    console.warn('[Auth] Envio de codigo de recuperacion no completado:', code || 'sin codigo');
  }

  return { status: 'otp_enviado' };
}

/**
 * Verifica el codigo y, solo si la cuenta tiene contrasena propia, la cambia.
 *
 * El orden no es casual. verifyOtp y updateUser van juntos, en la misma llamada,
 * y no repartidos entre dos pantallas: si se verificara al escribir el codigo y
 * el usuario cerrara el panel ahi, quedaria dentro de la aplicacion con la
 * contrasena vieja intacta, que es justo lo que venia a cambiar.
 *
 * Entre medias va la comprobacion de proveedores. Una cuenta que solo entra con
 * Google no recibe contrasena: se cierra la sesion que acaba de abrir el codigo
 * y se le manda a Google. Perder esa sesion es intencionado, porque entrar por
 * aqui seria una puerta lateral al login de Google, aunque el usuario haya
 * demostrado ser el dueño del correo.
 */
export async function completePasswordRecovery(
  email: string,
  code: string,
  newPassword: string
): Promise<RecoveryFinishResult> {
  try {
    await verifyEmailOtp(email.trim(), code, 'recovery');
  } catch (error) {
    throw new Error(authErrorMessage(error, 'No se pudo verificar el codigo.'), { cause: error });
  }

  // Si no se puede saber con que proveedores entra la cuenta, NO se sigue. El
  // `.catch(() => [])` que habia aqui parecia inofensivo y era lo contrario:
  // con la lista vacia, `soloGoogle` da false y la contrasena se cambiaba
  // igual. Es decir, bastaba con que el RPC fallara -o con provocar que
  // fallara- para saltarse la unica comprobacion que impide ponerle contrasena
  // a una cuenta de Google. Ante la duda no se toca nada.
  let providers: string[];
  try {
    providers = await fetchCurrentUserAuthProviders();
  } catch (error) {
    await logoutCurrentUser().catch(() => undefined);
    throw new Error('No se pudo comprobar la cuenta. Intentalo de nuevo.', { cause: error });
  }

  const soloGoogle = providers.includes('google') && !providers.includes('email');

  if (soloGoogle) {
    await logoutCurrentUser().catch(() => undefined);
    return { status: 'cuenta_google' };
  }

  try {
    await updateCurrentUserPassword(newPassword);
  } catch (error) {
    throw new Error(authErrorMessage(error, 'No se pudo cambiar la contrasena.'), { cause: error });
  }

  return { status: 'ok' };
}
