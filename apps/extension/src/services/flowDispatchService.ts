import { fetchLeadById } from './leadsService';
import { fetchTemplatesByType } from './templatesService';
import { logCallSend, logWhatsAppSend, loadTemplateSendLog, sendImmediateEmail } from './sendService';
import { buildLeadMessages, openWhatsAppMessages } from '../utils/waHelper';
import { markStepRegistered } from './messageFlowsService';
import type { PendingFlowStep } from '../types';

/**
 * Ejecuta un paso de flujo.
 *
 * **No crea un camino de envio paralelo**: llama a las mismas funciones de
 * `sendService` que usan los compositores, asi que el envio queda en
 * `send_logs` una sola vez, con la misma forma, y suma en el contador del lead
 * igual que un envio manual. El flujo solo orquesta encima.
 *
 * El paso se marca **despues** de que el envio devuelva su registro. Si el
 * envio falla, el paso se queda como estaba y se puede reintentar: dar por
 * registrado algo que no salio seria la peor de las mentiras posibles aqui.
 */
export async function dispatchFlowStep(userId: string, fila: PendingFlowStep): Promise<void> {
  const lead = await fetchLeadById(fila.leadId);
  if (!lead) throw new Error('No se encontro el lead de este paso.');

  const plantillas = await fetchTemplatesByType<{
    id: string | number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
    defaultReasonId?: number | null;
  }>(fila.channel);

  const plantilla = plantillas.find((t) => String(t.id) === fila.templateId);
  if (!plantilla) {
    throw new Error('La plantilla de este paso ya no existe. Edita el flujo para elegir otra.');
  }

  if (fila.channel === 'whatsapp') {
    // Se resuelve una vez y el mismo objeto alimenta el registro y la apertura,
    // igual que en el compositor: si se resolviera dos veces podrian separarse.
    const mensajes = buildLeadMessages([lead], plantilla.contenido);
    const log = await logWhatsAppSend(userId, fila.templateId, mensajes, plantilla.nombre);
    await openWhatsAppMessages(mensajes);
    await markStepRegistered(fila.progressId, log.find((l) => l.leadId === lead.id)?.id);
    return;
  }

  if (fila.channel === 'email') {
    const { sentLog } = await sendImmediateEmail(
      userId,
      fila.templateId,
      [lead],
      plantilla.asunto || '',
      plantilla.contenido,
      plantilla.isHtml || false,
      [],
      undefined,
      plantilla.nombre
    );
    await markStepRegistered(fila.progressId, sentLog.find((l) => l.leadId === lead.id)?.id);
    return;
  }

  // Llamada: no hay nada que abrir, solo queda constancia de que se hizo.
  await logCallSend(userId, fila.templateId, lead, {
    nombre: plantilla.nombre,
    contenido: plantilla.contenido,
  });
  const log = await loadTemplateSendLog(fila.templateId);
  await markStepRegistered(fila.progressId, log.find((l) => l.leadId === lead.id)?.id);
}
