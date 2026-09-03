import { supabase } from '../lib/supabaseClient';
import { ACTIVE_APPOINTMENT_STATUSES } from '../utils/appointmentStatus';

/** Un pendiente de un lead, reducido a lo que la lista necesita. */
export interface LeadPendingRow {
  leadId: string;
  id: string;
}

/**
 * Los leads del usuario con una cita todavia por delante.
 *
 * Se piden el lead y el identificador de la cita, nada mas: la lista no
 * muestra la cita, solo si la hay y a donde lleva al pulsarla. Traer la fila
 * entera seria descargar la agenda completa en cada visita a Leads.
 *
 * `start_time > now()` ademas del estado: una cita de ayer sin registrar sigue
 * en 'pendiente', y anunciarla como pendiente repetiria el error que ya se
 * corrigio en la ficha del lead.
 *
 * Ordenadas de la mas proxima a la mas lejana: con dos citas por delante, la
 * que interesa abrir es la siguiente.
 */
export async function fetchLeadIdsWithUpcomingAppointment(userId: string): Promise<LeadPendingRow[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, lead_id')
    .eq('user_id', userId)
    .in('status', [...ACTIVE_APPOINTMENT_STATUSES])
    .gt('start_time', new Date().toISOString())
    .not('lead_id', 'is', null)
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const fila = row as { id: unknown; lead_id: unknown };
    return { id: String(fila.id), leadId: String(fila.lead_id) };
  });
}

/**
 * Los leads del usuario con al menos una tarea sin completar.
 *
 * Por vencimiento, y las que no tienen fecha al final: con varias abiertas, la
 * que interesa abrir es la que vence antes.
 */
export async function fetchLeadIdsWithPendingTask(userId: string): Promise<LeadPendingRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, lead_id')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .not('lead_id', 'is', null)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const fila = row as { id: unknown; lead_id: unknown };
    return { id: String(fila.id), leadId: String(fila.lead_id) };
  });
}
