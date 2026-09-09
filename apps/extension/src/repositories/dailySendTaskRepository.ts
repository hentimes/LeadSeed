import { supabase } from '../lib/supabaseClient';

/** Lo que devuelve `ensure_daily_send_task`. Ver migracion 176. */
export interface ResultadoTareaDiariaRow {
  creada: boolean;
  /** Solo cuando no se creo: 'apagada', 'ya existe', 'sin sesion', 'sin perfil'. */
  motivo?: string;
  titulo?: string;
}

/**
 * Crea la tarea diaria de envios si toca.
 *
 * La comprobacion de "ya se creo hoy" vive DENTRO de la funcion, con la fila
 * del perfil bloqueada. No es un detalle: el disparador es abrir el panel, y
 * dos ventanas abiertas a la vez llegarian aqui las dos. Comprobarlo desde el
 * cliente con un select y despues insertar seria justo la carrera que la
 * funcion evita.
 */
export async function ensureDailySendTaskRow(
  hoy: string,
  pendientes: number,
): Promise<ResultadoTareaDiariaRow> {
  const { data, error } = await supabase.rpc('ensure_daily_send_task', {
    p_hoy: hoy,
    p_pendientes: pendientes,
  });

  if (error) {
    console.error('ensureDailySendTaskRow failed', error);
    return { creada: false, motivo: 'error' };
  }

  return (data ?? { creada: false }) as ResultadoTareaDiariaRow;
}
