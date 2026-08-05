/**
 * Los errores de supabase-js (PostgrestError, StorageError) son objetos
 * planos, no instancias de Error -- un `instanceof Error` los deja pasar
 * de largo y termina mostrando siempre el mensaje generico de fallback,
 * ocultando la causa real.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return fallback;
}
