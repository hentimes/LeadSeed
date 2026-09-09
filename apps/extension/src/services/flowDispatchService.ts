import { fetchLeadById } from './leadsService';
import { fetchTemplatesByType } from './templatesService';
import { logCallSend, logWhatsAppSend, loadTemplateSendLog, sendImmediateEmail } from './sendService';
import { buildLeadMessages, openWhatsAppMessages, type LeadMessage } from '../utils/waHelper';
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
/**
 * La plantilla de un paso, ya resuelta.
 *
 * Se expone para que el despacho en tanda pueda pedirla UNA vez para todo el
 * grupo -que por definicion comparte plantilla- en vez de una por destinatario.
 */
export async function plantillaDelPaso(fila: PendingFlowStep): Promise<PlantillaDePaso> {
  const plantillas = await fetchTemplatesByType<PlantillaDePaso>(fila.channel);
  const plantilla = plantillas.find((t) => String(t.id) === fila.templateId);
  if (!plantilla) {
    throw new Error('La plantilla de este paso ya no existe. Edita el flujo para elegir otra.');
  }
  return plantilla;
}

export interface PlantillaDePaso {
  id: string | number;
  nombre: string;
  contenido: string;
  asunto?: string;
  isHtml?: boolean;
  defaultReasonId?: number | null;
}

/**
 * REGISTRA UN PASO YA ABIERTO. No abre nada.
 *
 * Existe para el despacho en tanda por WhatsApp, donde quien abre el chat es la
 * cola guiada y no este servicio. El orden importa y es el contrario al del
 * despacho de a uno: **primero se abre y despues se registra**.
 *
 * Es el mismo criterio que ya documenta `useWhatsAppQueue`: registrar antes de
 * abrir deja el historial dando por enviados mensajes que nunca llegaron a
 * abrirse. Con la cola, entre abrir el primero y el ultimo pueden pasar veinte
 * minutos, asi que la diferencia deja de ser teorica.
 */
export async function registrarPasoAbierto(
  userId: string,
  fila: PendingFlowStep,
  plantilla: PlantillaDePaso,
  mensaje: LeadMessage,
): Promise<void> {
  const log = await logWhatsAppSend(userId, fila.templateId, [mensaje], plantilla.nombre);
  await markStepRegistered(fila.progressId, log.find((l) => l.leadId === mensaje.lead.id)?.id);
}

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
    const { result, sentLog } = await sendImmediateEmail(
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

    /*
     * SI EL CORREO NO SALIO, EL PASO NO SE MARCA.
     *
     * `sendEmailToLeads` no lanza cuando falla: devuelve un recuento con sus
     * errores. Aqui se ignoraba, asi que un correo rechazado -proveedor sin
     * configurar, clave vencida, direccion invalida- marcaba el paso como
     * registrado igual, y el trigger programaba el paso siguiente. El lead no
     * habia recibido nada y el flujo seguia adelante sin que nadie se enterara.
     *
     * Es la misma regla que el resto del despacho ya cumplia -"el paso se marca
     * DESPUES de que el envio devuelva su registro"- y que solo el correo se
     * saltaba, porque es el unico canal que informa el fallo devolviendolo en
     * vez de lanzandolo.
     *
     * El envio queda igualmente en `send_logs`: eso lo escribe
     * `sendImmediateEmail` y no se toca aqui. Lo que no ocurre es dar el paso
     * por hecho, que es lo que hace avanzar el flujo.
     */
    if (result.sent === 0) {
      throw new Error(
        result.errors[0] ||
          (result.total === 0
            ? `${lead.name} no tiene correo, así que este paso no puede salir.`
            : 'El correo no se pudo enviar.'),
      );
    }

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
