/**
 * Dos funciones, dos destinatarios. No las fusiones.
 *
 * Los errores de supabase-js (PostgrestError, StorageError) son objetos planos,
 * no instancias de Error: un `instanceof Error` los deja pasar de largo y
 * termina mostrando siempre el mensaje generico de fallback, ocultando la causa
 * real. Ambas funciones existen para resolver eso, pero para publicos distintos.
 *
 * - `getErrorMessage` es para la UI. Devuelve una frase legible por una persona.
 * - `describeError` es para `console.error`. Devuelve todo el detalle tecnico.
 *
 * La auditoria del 2026-08-11 propuso unificarlas en la version mas completa.
 * Eso seria un error: le mostraria `code=42501 | details=...` al usuario final.
 * Ver capitulo 13.4 del roadmap.
 */

/**
 * Mensaje apto para mostrar en la interfaz.
 *
 * Cae al `fallback` cuando el error no aporta un mensaje util, incluido el caso
 * de un `message` presente pero vacio o solo con espacios.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;

  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }

  return fallback;
}

/**
 * Descripcion tecnica completa para logs.
 *
 * Los errores de Supabase se registraban como `[object Object]`, que no sirve
 * para diagnosticar nada. Esto extrae los campos que si ayudan (`code`,
 * `details`, `hint`) y, si no hay ninguno, cae a `JSON.stringify`.
 *
 * No usar para texto visible por el usuario.
 */
export function describeError(error: unknown): string {
  if (!error) return 'error desconocido';
  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    const candidate = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    const parts = [
      candidate.message,
      candidate.code ? `code=${candidate.code}` : '',
      candidate.details ? `details=${candidate.details}` : '',
      candidate.hint ? `hint=${candidate.hint}` : '',
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(' | ');

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}
