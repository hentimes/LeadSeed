import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useWhatsAppQueue, type WhatsAppQueueState } from '../hooks/useWhatsAppQueue';
import { logWhatsAppSend } from '../services/sendService';
import { markStepRegistered } from '../services/messageFlowsService';
import { useAuth } from './AuthContext';

interface Valor {
  cola: WhatsAppQueueState;
  /**
   * Sube con cada envio registrado y con cada uno deshecho.
   *
   * Es la señal para que quien muestre contadores -el cupo del dia, los
   * destinatarios que ya recibieron esta plantilla- vuelva a contar. Se cuenta
   * de la base y no se lleva la cuenta aqui: el numero exacto lo sabe ella.
   */
  version: number;
  /** El registro de envio que se escribio al abrir el chat de este lead. */
  envioRegistradoDe: (leadId: string) => number | undefined;
  /** Avisa que un envio ya contado dejo de contar. */
  marcarCambio: () => void;
}

const Contexto = createContext<Valor | null>(null);

/**
 * LA RONDA DE ENVIO POR WHATSAPP, UNA SOLA PARA TODA LA APLICACION.
 *
 * ## Por que vive tan arriba
 *
 * `Enviar`, `Plantillas` y `Flujos` se ven como tres pestañas pero son tres
 * PAGINAS: `AppPageRenderer` conmuta entre ellas y la que sale se desmonta.
 * Con la cola dentro de una pagina, empezar una ronda en Flujos y tocar
 * "Enviar" la borraba a mitad de camino.
 *
 * Por encima del conmutador, la ronda sobrevive a la navegacion. Eso es lo que
 * permite que Flujos no necesite su propio panel: carga los destinatarios y te
 * manda a Enviar, donde la ronda continua.
 *
 * ## Por que ademas quita una duplicacion
 *
 * Antes habia dos `onAbierto`: el del compositor registraba el envio y el de
 * la tanda de flujos registraba y ademas marcaba el paso. Dos caminos para lo
 * mismo, que solo se distinguian en un dato que el mensaje no sabia llevar.
 *
 * Ahora el mensaje lleva su paso -`LeadMessage.pasoDeFlujo`- y este callback es
 * el unico que registra envios de la cola: siempre escribe en `send_logs`, y
 * ademas marca el paso cuando el mensaje trae uno. La regla de ordenamiento que
 * costo descubrir -abrir primero, registrar despues- se cumple en un solo sitio
 * en vez de en dos que podian separarse.
 */
export function WhatsAppQueueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  /*
   * El registro que se escribio por cada lead de la ronda.
   *
   * Hace falta para deshacerlo cuando el numero resulta no estar en WhatsApp.
   * Se guarda al escribirlo en vez de buscarlo despues: `logWhatsAppSend`
   * devuelve el historial entero de la plantilla, y elegir ahi "el mas
   * reciente de este lead" es adivinar cual deshacer.
   *
   * En una ref y no en estado: no se pinta, y cambiarlo no tiene que redibujar
   * la aplicacion entera.
   */
  const registrosPorLead = useRef(new Map<string, number>());

  const cola = useWhatsAppQueue({
    onAbierto: async (mensaje, tanda) => {
      if (!user) return;

      const log = await logWhatsAppSend(user.id, tanda.templateId, [mensaje], tanda.templateName);
      const fila = log.find((l) => l.leadId === mensaje.lead.id);
      if (mensaje.lead.id && fila?.id !== undefined) {
        registrosPorLead.current.set(mensaje.lead.id, fila.id);
      }

      /*
       * El paso se marca DESPUES de que el envio devuelva su registro, y el
       * trigger de la base programa el siguiente. Sin esto el paso quedaria
       * pendiente para siempre y en la proxima ronda se mandaria otra vez.
       */
      if (mensaje.pasoDeFlujo) {
        await markStepRegistered(mensaje.pasoDeFlujo.progressId, fila?.id);
      }

      setVersion((n) => n + 1);
    },
  });

  const envioRegistradoDe = useCallback(
    (leadId: string) => registrosPorLead.current.get(leadId),
    [],
  );

  const marcarCambio = useCallback(() => setVersion((n) => n + 1), []);

  return (
    <Contexto.Provider value={{ cola, version, envioRegistradoDe, marcarCambio }}>
      {children}
    </Contexto.Provider>
  );
}

export function useColaDeWhatsApp(): Valor {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useColaDeWhatsApp necesita estar dentro de WhatsAppQueueProvider');
  }
  return valor;
}
