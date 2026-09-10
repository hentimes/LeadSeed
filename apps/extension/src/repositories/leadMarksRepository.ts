import { supabase } from '../lib/supabaseClient';

/**
 * Las dos marcas que se ponen sobre un lead durante una ronda de envio.
 *
 * Van por RPC y no por un `update` suelto porque cada una son varias
 * escrituras -marcar al lead, cerrar sus flujos, omitir lo que quedaba
 * pendiente y meterlo en su lista- que no tienen sentido a medias: un lead
 * marcado con la inscripcion todavia activa seguiria recibiendo mensajes.
 *
 * Ver migracion 186.
 */

/**
 * El numero de este lead no esta en WhatsApp.
 *
 * `sendLogId` es el registro que se acaba de escribir al abrir el chat, para
 * que ese mensaje deje de contar. Va nulo cuando no hay ninguno que deshacer.
 */
export async function callMarcarLeadSinWhatsApp(
  leadId: string,
  sendLogId: number | null,
): Promise<void> {
  const { error } = await supabase.rpc('marcar_lead_sin_whatsapp', {
    p_lead_id: leadId,
    p_send_log_id: sendLogId,
  });
  if (error) throw error;
}

/** Este lead pidio no recibir mas mensajes. No deshace ningun envio. */
export async function callMarcarLeadNoContactar(
  leadId: string,
  nota: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('marcar_lead_no_contactar', {
    p_lead_id: leadId,
    p_nota: nota,
  });
  if (error) throw error;
}
