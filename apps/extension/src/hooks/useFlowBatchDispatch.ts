import { useCallback, useState } from 'react';
import { dispatchFlowStep, plantillaDelPaso } from '../services/flowDispatchService';
import { fetchLeadsByIds } from '../services/leadsService';
import { buildLeadMessages } from '../utils/waHelper';
import { getErrorMessage } from '../utils/errorMessage';
import { useColaDeWhatsApp } from '../contexts/WhatsAppQueueContext';
import type { PendingFlowStep } from '../types';

/**
 * MANDAR UN GRUPO ENTERO DE LA COLA DEL DIA.
 *
 * ## El problema que resuelve
 *
 * "Hoy" decia que a cuarenta y siete personas les tocaba el mismo mensaje y
 * daba un boton por fila. Cuarenta y siete idas y vueltas, cada una con su
 * scroll para encontrar la siguiente. Saber que toca no sirve de nada sin una
 * forma de hacerlo.
 *
 * ## Por que ya no tiene cola propia
 *
 * La tenia, con este argumento: "en el compositor un destinatario es solo un
 * lead, no hay donde colgar el paso del flujo". Era cierto y era la
 * descripcion de una carencia del tipo, no una razon de diseño. Se uso para
 * justificar una segunda cola, un segundo panel y un segundo registro de
 * envios; dos caminos que hacian lo mismo y podian separarse.
 *
 * Ahora el paso viaja dentro del mensaje -`LeadMessage.pasoDeFlujo`- y la ronda
 * usa la cola de la aplicacion, la misma de "Enviar". Esta funcion arma los
 * destinatarios con su paso y se los entrega; quien abre los chats, registra
 * los envios y marca los pasos es `WhatsAppQueueProvider`, en un solo sitio.
 *
 * La pantalla que llama a esto se encarga de llevar al usuario a "Enviar", que
 * es donde la ronda se ve. La cola vive por encima del conmutador de paginas
 * justamente para que ese viaje no la borre.
 *
 * ## Los otros canales no usan cola
 *
 * Un correo sale solo y una llamada solo se registra: no hay nada que esperar
 * de una persona entre uno y otro. Para esos, la tanda es un bucle que reporta
 * al terminar. Meterlos en la cola guiada seria pedir un clic por cada uno para
 * nada.
 */
export interface FlowBatchDispatch {
  /** Hay una tanda de correo o llamada en curso. */
  procesando: boolean;
  error: string;
  /** Cuantos se despacharon en la ultima tanda sin cola. */
  ultimoResultado: string;
  /**
   * Arranca la tanda de un grupo. `tope` acota cuantos entran -el cupo del dia-
   * y se aplica ANTES de abrir nada.
   *
   * Devuelve `true` si la tanda quedo cargada en la cola de WhatsApp, para que
   * la pantalla sepa que tiene que navegar a "Enviar". Las de correo y llamada
   * devuelven `false`: se resuelven aqui mismo y no hay nada que ver en otra
   * pantalla.
   */
  despacharGrupo: (filas: PendingFlowStep[], tope: number) => Promise<boolean>;
}

export function useFlowBatchDispatch(userId: string | undefined): FlowBatchDispatch {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState('');
  const { cola } = useColaDeWhatsApp();

  const despacharGrupo = useCallback(
    async (filas: PendingFlowStep[], tope: number): Promise<boolean> => {
      const primera = filas[0];
      if (!userId || !primera) return false;

      setError('');
      setUltimoResultado('');

      // El cupo se aplica antes de abrir nada: es la unica forma de que un tope
      // de cincuenta no dependa de que alguien se acuerde de parar.
      const enTanda = filas.slice(0, Math.max(0, tope));
      if (enTanda.length === 0) {
        /* El cupo diario es de WhatsApp; para los otros canales el tope es el
           tamaño del grupo, asi que aqui no se llega por esa via. */
        setError(
          primera.channel === 'whatsapp'
            ? 'No queda cupo de WhatsApp para hoy.'
            : 'No hay nada que despachar en este grupo.',
        );
        return false;
      }

      try {
        const suPlantilla = await plantillaDelPaso(primera);

        if (primera.channel !== 'whatsapp') {
          /*
           * Correo y llamada salen solos: bucle, sin cola guiada. No hay nada
           * que esperar de una persona entre uno y otro.
           */
          setProcesando(true);
          let hechos = 0;
          let primerFallo = '';

          for (const fila of enTanda) {
            try {
              await dispatchFlowStep(userId, fila);
              hechos += 1;
            } catch (fallo) {
              /*
               * Uno que falla no frena a los otros cuarenta y seis, pero su
               * motivo NO se tira.
               *
               * Se guarda el primero y se muestra. Un recuento seco -"0 de 47
               * despachados"- es lo que se ve cuando el proveedor de correo no
               * esta configurado, y deja al usuario sin saber si el problema es
               * suyo, de los leads o de la aplicacion. Casi siempre los 47
               * fallan por lo mismo, asi que con el primer motivo alcanza.
               */
              if (!primerFallo) primerFallo = getErrorMessage(fallo, 'Error desconocido');
            }
          }

          const fallaron = enTanda.length - hechos;
          setUltimoResultado(
            `${hechos} de ${enTanda.length} despachados${
              fallaron > 0 ? ` · ${fallaron} sin enviar: ${primerFallo}` : ''
            }`,
          );
          /* Sin ninguno enviado no es un resultado parcial, es un fallo: va al
             canal de error para que se vea como tal. */
          if (hechos === 0 && fallaron > 0) setError(primerFallo);
          return false;
        }

        /*
         * Los leads completos, en UNA consulta para todo el grupo. La fila de
         * la cola trae nombre y telefono, pero el mensaje puede usar {empresa}
         * o {rut}, y con datos a medias esas variables se quedarian sin
         * resolver en el texto que se manda.
         */
        const leads = await fetchLeadsByIds(enTanda.map((fila) => fila.leadId));
        const porId = new Map(leads.map((lead) => [lead.id!, lead]));
        const conLead = enTanda.filter((fila) => porId.has(fila.leadId));

        const mensajes = buildLeadMessages(
          conLead.map((fila) => porId.get(fila.leadId)!),
          suPlantilla.contenido,
        );

        /*
         * Cada mensaje se lleva SU paso. Es lo que hace que el flujo avance sin
         * una cola aparte: la cola registra el envio siempre y marca el paso
         * cuando el mensaje trae uno.
         *
         * Van emparejados por posicion porque `buildLeadMessages` conserva el
         * orden de `conLead`, que es de donde salen las dos listas.
         */
        const conPaso = mensajes.map((mensaje, i) => {
          const fila = conLead[i]!;
          return {
            ...mensaje,
            pasoDeFlujo: { progressId: fila.progressId, enrollmentId: fila.enrollmentId },
          };
        });

        await cola.iniciar(conPaso, {
          templateId: suPlantilla.id,
          templateName: suPlantilla.nombre,
        });
        return true;
      } catch (e) {
        setError(getErrorMessage(e, 'No se pudo empezar la tanda.'));
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [cola, userId],
  );

  return { procesando, error, ultimoResultado, despacharGrupo };
}
