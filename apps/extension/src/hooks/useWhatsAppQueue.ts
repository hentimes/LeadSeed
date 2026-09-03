import { useCallback, useState } from 'react';
import type { LeadMessage } from '../utils/waHelper';
import { openWhatsApp } from '../utils/waHelper';
import { getErrorMessage } from '../utils/errorMessage';

export interface WhatsAppQueueState {
  /** Los destinatarios del envio en curso. Vacio si no hay envio abierto. */
  mensajes: LeadMessage[];
  /** Posicion del que esta abierto en WhatsApp, empezando en 0. */
  indice: number;
  actual: LeadMessage | undefined;
  siguiente: LeadMessage | undefined;
  total: number;
  activa: boolean;
  abriendo: boolean;
  error: string;
  /** Abre el chat del primero y deja la cola en marcha. */
  iniciar: (mensajes: LeadMessage[]) => Promise<void>;
  /** Abre el chat del siguiente destinatario. */
  avanzar: () => Promise<void>;
  /** Cierra la cola sin abrir el resto. */
  terminar: () => void;
  reintentar: () => Promise<void>;
}

interface Opciones {
  /**
   * Se llama justo despues de abrir el chat de un destinatario, para dejarlo
   * registrado. Se hace de a uno a proposito: antes se registraba el envio
   * completo antes de abrir nada, asi que el historial daba por enviados
   * mensajes que nunca llegaron a abrirse.
   */
  onAbierto?: (mensaje: LeadMessage) => Promise<void> | void;
}

/**
 * Cola guiada de envio por WhatsApp.
 *
 * WhatsApp Web solo sostiene una conversacion a la vez y cada mensaje lo tiene
 * que enviar una persona: no existe el envio masivo de verdad. Lo que existe
 * es esta cola, que abre un chat, espera a que quien envia vuelva, y abre el
 * siguiente. Asi ningun destinatario se pierde y el historial solo cuenta los
 * que de verdad se abrieron.
 */
export function useWhatsAppQueue({ onAbierto }: Opciones = {}): WhatsAppQueueState {
  const [mensajes, setMensajes] = useState<LeadMessage[]>([]);
  const [indice, setIndice] = useState(0);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState('');

  const abrir = useCallback(
    async (mensaje: LeadMessage) => {
      setAbriendo(true);
      setError('');
      try {
        await openWhatsApp(mensaje.lead.phone, mensaje.message);
        await onAbierto?.(mensaje);
      } catch (err) {
        setError(getErrorMessage(err, `No se pudo abrir el chat de ${mensaje.lead.name}`));
      } finally {
        setAbriendo(false);
      }
    },
    [onAbierto],
  );

  const iniciar = useCallback(
    async (nuevos: LeadMessage[]) => {
      const primero = nuevos[0];
      if (!primero) return;

      setMensajes(nuevos);
      setIndice(0);
      await abrir(primero);
    },
    [abrir],
  );

  const avanzar = useCallback(async () => {
    const proximo = mensajes[indice + 1];
    if (!proximo) {
      setMensajes([]);
      setIndice(0);
      return;
    }

    setIndice((actual) => actual + 1);
    await abrir(proximo);
  }, [mensajes, indice, abrir]);

  const reintentar = useCallback(async () => {
    const actual = mensajes[indice];
    if (actual) await abrir(actual);
  }, [mensajes, indice, abrir]);

  const terminar = useCallback(() => {
    setMensajes([]);
    setIndice(0);
    setError('');
  }, []);

  return {
    mensajes,
    indice,
    actual: mensajes[indice],
    siguiente: mensajes[indice + 1],
    total: mensajes.length,
    activa: mensajes.length > 0,
    abriendo,
    error,
    iniciar,
    avanzar,
    terminar,
    reintentar,
  };
}
