import { supabase } from '../lib/supabaseClient';

/** Cuotas del plan, como `{feature_id: limite}`. Ver migracion 182. */
export type CuotasDelPlan = Record<string, number>;

/**
 * Las cuotas numericas del usuario actual.
 *
 * Devuelve `{}` si algo falla, y `{}` significa SIN LIMITE en todo. Es la
 * unica lectura segura ante un error: tratar el fallo como "cero de todo"
 * dejaria a la persona sin poder crear nada, y el sintoma seria
 * indistinguible de haber agotado el plan.
 */
export async function fetchMyLimits(): Promise<CuotasDelPlan> {
  const { data, error } = await supabase.rpc('get_my_limits');

  if (error) {
    console.error('fetchMyLimits failed', error);
    return {};
  }

  return (data ?? {}) as CuotasDelPlan;
}
