/**
 * Recuerda que el usuario dejo un codigo a medias.
 *
 * Hace falta por una particularidad del alta con confirmacion: `signUp` NO
 * devuelve sesion. Entre crear la cuenta y canjear el codigo no hay nada que
 * Supabase pueda restaurar, asi que si el usuario cierra el panel del navegador
 * -que en una extension pasa con solo pinchar fuera- al volver se encuentra el
 * formulario en blanco, con una cuenta ya creada que no puede confirmar ni
 * volver a registrar. Guardar el correo y el momento resuelve eso.
 *
 * Lo que NO se guarda, y es lo importante:
 *
 * - La contrasena. Ya viajo a Supabase y esta en `auth.users`; conservarla en
 *   el almacenamiento local seria dejar una credencial en claro a cambio de
 *   nada.
 * - El codigo. Vive en memoria mientras dura la pantalla. Persistirlo
 *   equivaldria a guardar la llave debajo del felpudo.
 *
 * Por eso volver a la vista de contrasena nueva tras cerrar el panel pide un
 * codigo nuevo. Es una molestia aceptada a cambio de no dejar rastro.
 */

import { getPlatform } from '../platform/registry';

/** Para que se pidio el codigo. Determina el tipo que espera `verifyOtp`. */
export type OtpPurpose = 'signup' | 'recovery';

export interface PendingAuthFlow {
  purpose: OtpPurpose;
  email: string;
  /** Milisegundos desde epoch en que se pidio el codigo. */
  startedAt: number;
}

const STORAGE_KEY = 'pendingAuthFlow';

/**
 * Cuanto se recuerda el flujo.
 *
 * Es mas largo que la caducidad real del codigo (5 minutos, `otp_expiry` en
 * supabase/config.toml) y eso es intencionado: si el codigo ya caduco, conviene
 * devolver al usuario a la pantalla del codigo y dejar que Supabase se lo diga y
 * le ofrezca reenviar, en vez de mandarlo al inicio sin explicacion.
 */
const MAX_AGE_MS = 60 * 60 * 1000;

function isPendingAuthFlow(value: unknown): value is PendingAuthFlow {
  if (!value || typeof value !== 'object') return false;
  const flow = value as Partial<PendingAuthFlow>;
  return (
    (flow.purpose === 'signup' || flow.purpose === 'recovery') &&
    typeof flow.email === 'string' &&
    flow.email.length > 0 &&
    typeof flow.startedAt === 'number' &&
    Number.isFinite(flow.startedAt)
  );
}

export async function savePendingAuthFlow(flow: PendingAuthFlow): Promise<void> {
  await getPlatform().storage.local.set({ [STORAGE_KEY]: flow });
}

/**
 * Devuelve el flujo pendiente, o `null` si no hay o ya es viejo.
 *
 * No lanza nunca. El puerto de almacenamiento promete no fallar cuando no esta
 * disponible -en web plano devuelve un objeto vacio- y aqui se trata "no hay
 * nada guardado" como el caso normal, no como un error: quedarse sin poder
 * entrar porque el almacenamiento no responde seria mucho peor que empezar de
 * cero.
 */
export async function loadPendingAuthFlow(): Promise<PendingAuthFlow | null> {
  const stored = await getPlatform()
    .storage.local.get([STORAGE_KEY])
    .catch(() => ({}) as Record<string, unknown>);

  const flow = stored[STORAGE_KEY];
  if (!isPendingAuthFlow(flow)) return null;

  if (Date.now() - flow.startedAt > MAX_AGE_MS) {
    await clearPendingAuthFlow();
    return null;
  }

  return flow;
}

export async function clearPendingAuthFlow(): Promise<void> {
  await getPlatform()
    .storage.local.set({ [STORAGE_KEY]: null })
    .catch(() => undefined);
}
