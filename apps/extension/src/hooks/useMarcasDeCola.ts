import { useCallback, useState } from 'react';
import { marcarNoContactar, marcarSinWhatsApp } from '../services/leadMarks';
import { marcarPasoSinWhatsApp } from '../services/messageFlowsService';
import { getErrorMessage } from '../utils/errorMessage';
import { useColaDeWhatsApp } from '../contexts/WhatsAppQueueContext';
import type { AccionesDeSalida } from '../types';

export interface MarcasDeCola {
  acciones: AccionesDeSalida;
  /** Que paso con la ultima marca, o el motivo por el que no se pudo. */
  aviso: string;
}

/**
 * MARCAR AL DE TURNO DURANTE UNA RONDA DE ENVIO.
 *
 * ## Un solo cableado para las dos rondas
 *
 * Hubo dos: uno en la tanda de flujos y otro en el compositor, escritos con
 * dias de diferencia y ya divergiendo en los mensajes de error. Existian porque
 * la ronda de flujos tenia su propia cola.
 *
 * Ahora la cola es una sola y el mensaje sabe si trae un paso de flujo, asi que
 * la decision cabe en un `if`:
 *
 *   Con paso, se llama al RPC que ademas DESHACE el paso -lo devuelve a
 *   omitido y borra el siguiente que el trigger acababa de programar-. Sin eso
 *   el flujo seguiria adelante hacia un numero que no existe.
 *
 *   Sin paso, basta con marcar al lead y borrar su registro de envio.
 *
 * Las dos ramas terminan marcando al lead igual, porque el RPC del paso delega
 * en el del lead. Ver migraciones 184 y 186.
 *
 * ## Si falla, no se avanza
 *
 * Avanzar igual dejaria al lead sin marcar y ya fuera de la pantalla, sin nada
 * que delatara que la marca no llego a guardarse. Quedandose donde esta, el
 * error se ve y se puede volver a intentar sobre el mismo.
 */
export function useMarcasDeCola(): MarcasDeCola {
  const { cola, envioRegistradoDe, marcarCambio } = useColaDeWhatsApp();
  const [aviso, setAviso] = useState('');

  const onSinWhatsApp = useCallback(async () => {
    const mensaje = cola.actual;
    const lead = mensaje?.lead;
    if (!mensaje || !lead?.id) return;

    try {
      if (mensaje.pasoDeFlujo) {
        await marcarPasoSinWhatsApp(mensaje.pasoDeFlujo.progressId);
      } else {
        await marcarSinWhatsApp(lead.id, envioRegistradoDe(lead.id) ?? null);
      }
    } catch (e) {
      setAviso(getErrorMessage(e, 'No se pudo marcar el número como sin WhatsApp.'));
      return;
    }

    // El envio que se escribio al abrir el chat dejo de contar: los contadores
    // del dia tienen que volver a leerse o el tope frenaria antes de tiempo.
    marcarCambio();
    setAviso(`${lead.name} quedó en la lista "Sin WhatsApp" y ese mensaje ya no cuenta.`);
    await cola.avanzar();
  }, [cola, envioRegistradoDe, marcarCambio]);

  const onNoContactar = useCallback(
    async (nota: string) => {
      const lead = cola.actual?.lead;
      if (!lead?.id) return;

      try {
        /*
         * No se deshace el envio, ni con paso ni sin el: el mensaje si salio, y
         * es el que provoco la respuesta. Y no hace falta cerrar el flujo
         * aparte, porque `no_contactar` cierra TODAS sus inscripciones activas,
         * de todos los canales.
         */
        await marcarNoContactar(lead.id, nota);
      } catch (e) {
        setAviso(getErrorMessage(e, 'No se pudo marcar el contacto.'));
        return;
      }

      setAviso(`${lead.name} quedó en la lista "No contactar" y salió de todos sus flujos.`);
      await cola.avanzar();
    },
    [cola],
  );

  return { acciones: { onSinWhatsApp, onNoContactar }, aviso };
}
