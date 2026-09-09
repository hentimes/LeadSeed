import { supabase } from '../lib/supabaseClient';
import type { Page } from '../types';

/**
 * Suma segundos de uso a una seccion.
 *
 * NO recibe el id del usuario: lo toma la funcion de la base desde
 * `auth.uid()`. Antes se mandaba por parametro, lo que permitia escribir
 * telemetria a nombre de cualquiera (migracion 173).
 */
export async function incrementTelemetry(section: Page, seconds: number): Promise<void> {
  const { error } = await supabase.rpc('increment_telemetry', {
    p_section: section,
    p_seconds: seconds,
  });

  if (error) {
    throw error;
  }
}
