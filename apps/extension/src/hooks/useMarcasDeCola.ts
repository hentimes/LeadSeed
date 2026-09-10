import { useCallback, useState } from 'react';
import { marcarNoContactar, marcarSinWhatsApp } from '../services/leadMarks';
import { getErrorMessage } from '../utils/errorMessage';
import type { WhatsAppQueueState } from './useWhatsAppQueue';
import type { AccionesDeSalida, SendLog } from '../types';

interface Opciones {
  cola: WhatsAppQueueState;
  /**
   * El historial de la plantilla en curso. De ahi sale el registro que hay que
   * deshacer al marcar "no tiene WhatsApp": `logWhatsAppSend` devuelve el
   * historial entero y no la fila que acaba de escribir.
   */
  historial: SendLog[];
  /**
   * Se llama cuando un envio ya contado deja de contar, para que el contador
   * del dia lo refleje. Sin esto el tope frenaria antes de tiempo.
   */
  onEnvioDeshecho: () => Promise<void> | void;
}

export interface MarcasDeCola {
  acciones: AccionesDeSalida;
  /** Que paso con la ultima marca, o el motivo por el que no se pudo. */
  aviso: string;
}

/**
 * MARCAR AL DE TURNO DURANTE UNA RONDA DE ENVIO MASIVO.
 *
 * ## Por que existe aparte de `useFlowBatchDispatch`
 *
 * Ese gancho hace lo mismo para la ronda de Flujos, donde cada destinatario
 * trae su paso y su inscripcion. Aqui no hay ninguna de las dos: en el envio
 * masivo un destinatario es solo un lead. Las marcas se ponen sobre la persona
 * y no sobre una inscripcion que no existe.
 *
 * Las dos vias terminan en las mismas funciones de la base -ver migracion
 * 186-, asi que no pueden divergir aunque el camino sea distinto.
 *
 * ## Si falla, no se avanza
 *
 * Avanzar igual dejaria al lead sin marcar y ya fuera de la pantalla, sin nada
 * que delatara que la marca no llego a guardarse. Quedandose donde esta, el
 * error se ve y se puede volver a intentar sobre el mismo.
 */
export function useMarcasDeCola({ cola, historial, onEnvioDeshecho }: Opciones): MarcasDeCola {
  const [aviso, setAviso] = useState('');

  const onSinWhatsApp = useCallback(async () => {
    const lead = cola.actual?.lead;
    if (!lead?.id) return;

    try {
      await marcarSinWhatsApp(lead.id, historial);
      await onEnvioDeshecho();
      setAviso(`${lead.name} quedó en la lista "Sin WhatsApp" y ese mensaje ya no cuenta.`);
    } catch (e) {
      setAviso(getErrorMessage(e, 'No se pudo marcar el número como sin WhatsApp.'));
      return;
    }
    await cola.avanzar();
  }, [cola, historial, onEnvioDeshecho]);

  const onNoContactar = useCallback(
    async (nota: string) => {
      const lead = cola.actual?.lead;
      if (!lead?.id) return;

      try {
        // No se deshace el envio: el mensaje si salio, y es el que provoco la
        // respuesta.
        await marcarNoContactar(lead.id, nota);
        setAviso(`${lead.name} quedó en la lista "No contactar" y salió de todos sus flujos.`);
      } catch (e) {
        setAviso(getErrorMessage(e, 'No se pudo marcar el contacto.'));
        return;
      }
      await cola.avanzar();
    },
    [cola],
  );

  return { acciones: { onSinWhatsApp, onNoContactar }, aviso };
}
