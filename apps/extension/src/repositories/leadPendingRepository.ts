import { supabase } from '../lib/supabaseClient';
import { ACTIVE_APPOINTMENT_STATUSES } from '../utils/appointmentStatus';

/**
 * Los leads del usuario con una cita todavia por delante.
 *
 * Se piden solo los identificadores: la tabla no muestra la cita, solo si la
 * hay. Traer la fila entera de cada cita para pintar un icono seria pagar el
 * ancho de banda de la agenda completa en cada visita a Leads.
 *
 * `start_time > now()` ademas del estado: una cita de ayer sin registrar sigue
 * en 'pendiente', y anunciarla como pendiente en la lista repetiria el error
 * que ya se corrigio en la ficha del lead.
 */
export async function fetchLeadIdsWithUpcomingAppointment(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('lead_id')
    .eq('user_id', userId)
    .in('status', [...ACTIVE_APPOINTMENT_STATUSES])
    .gt('start_time', new Date().toISOString())
    .not('lead_id', 'is', null);

  if (error) throw error;

  return (data ?? []).map((row) => String((row as { lead_id: unknown }).lead_id));
}

/** Los leads del usuario con al menos una tarea sin completar. */
export async function fetchLeadIdsWithPendingTask(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('lead_id')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .not('lead_id', 'is', null);

  if (error) throw error;

  return (data ?? []).map((row) => String((row as { lead_id: unknown }).lead_id));
}
