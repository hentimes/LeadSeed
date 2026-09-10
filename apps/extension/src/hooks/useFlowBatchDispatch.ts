import { useCallback, useRef, useState } from 'react';
import { useWhatsAppQueue, type WhatsAppQueueState } from './useWhatsAppQueue';
import {
  dispatchFlowStep,
  plantillaDelPaso,
  registrarPasoAbierto,
} from '../services/flowDispatchService';
import { exitEnrollment, marcarPasoSinWhatsApp } from '../services/messageFlowsService';
import { fetchLeadsByIds } from '../services/leadsService';
import { buildLeadMessages } from '../utils/waHelper';
import { getErrorMessage } from '../utils/errorMessage';
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
 * ## Por que aqui y no en "Enviar"
 *
 * Porque en el compositor un destinatario es solo un lead: no hay donde colgar
 * el paso del flujo. Si el envio sale por ahi, el mensaje queda en el historial
 * pero el flujo no se entera, el paso sigue pendiente para siempre y en la
 * proxima ronda se manda otra vez. El identificador del paso tiene que viajar
 * con cada destinatario, y eso solo pasa si la tanda vive en la cola.
 *
 * ## Como funciona
 *
 * Reutiliza `useWhatsAppQueue`, la misma cola guiada del envio masivo: abre un
 * chat, espera a que la persona vuelva, abre el siguiente. No hay envio masivo
 * de verdad en WhatsApp y esta es la unica forma honesta de acercarse.
 *
 * Lo que agrega es el registro: al abrir cada chat -y no antes- se registra el
 * envio y se marca ESE paso, con lo que el flujo avanza y programa el
 * siguiente. El orden importa y es el contrario al del despacho de a uno:
 * registrar antes de abrir daria por enviados los cuarenta y siete en cuanto se
 * abre el primero.
 *
 * ## Los otros canales no usan cola
 *
 * Un correo sale solo y una llamada solo se registra: no hay nada que esperar
 * de una persona entre uno y otro. Para esos, la tanda es un bucle que reporta
 * al terminar. Meterlos en la cola guiada seria pedir un clic por cada uno para
 * nada.
 */
export interface FlowBatchDispatch {
  /** La cola guiada de WhatsApp, para pintar su panel. */
  cola: WhatsAppQueueState;
  /** Hay una tanda de correo o llamada en curso. */
  procesando: boolean;
  error: string;
  /** Cuantos se despacharon en la ultima tanda sin cola. */
  ultimoResultado: string;
  /**
   * Arranca la tanda de un grupo. `tope` acota cuantos entran -el cupo del dia-
   * y se aplica ANTES de abrir nada.
   */
  despacharGrupo: (filas: PendingFlowStep[], tope: number) => Promise<void>;
  /**
   * El numero del que esta abierto no tiene WhatsApp: deshace su registro y lo
   * saca del flujo. Avanza la cola al siguiente.
   */
  marcarSinWhatsApp: () => Promise<void>;
  /**
   * El que esta abierto pidio no recibir mas mensajes. Avanza la cola.
   *
   * A diferencia de la anterior NO deshace el envio: el mensaje si salio, y es
   * precisamente el que provoco la respuesta.
   */
  sacarPorNoContactar: (nota: string) => Promise<void>;
}

interface Avisos {
  /** Se despacho un paso: sube el contador del cupo. */
  onDespachado: () => void;
  /** Un envio ya contado dejo de contar: el contador del cupo baja. */
  onRevertido: () => void;
}

export function useFlowBatchDispatch(
  userId: string | undefined,
  { onDespachado, onRevertido }: Avisos,
): FlowBatchDispatch {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState('');

  /*
   * El grupo en curso vive en una ref y no en estado: lo lee el callback que
   * `useWhatsAppQueue` guarda al montar, y desde el estado leeria siempre el
   * valor del primer render.
   */
  const grupo = useRef(new Map<string, PendingFlowStep>());
  const plantilla = useRef<Awaited<ReturnType<typeof plantillaDelPaso>> | null>(null);

  const cola = useWhatsAppQueue({
    onAbierto: async (mensaje) => {
      const fila = mensaje.lead.id ? grupo.current.get(mensaje.lead.id) : undefined;
      if (!fila || !userId || !plantilla.current) return;
      await registrarPasoAbierto(userId, fila, plantilla.current, mensaje);
      onDespachado();
    },
  });

  const despacharGrupo = useCallback(
    async (filas: PendingFlowStep[], tope: number) => {
      const primera = filas[0];
      if (!userId || !primera) return;

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
        return;
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
              onDespachado();
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
          return;
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
        grupo.current = new Map(conLead.map((fila) => [fila.leadId, fila]));
        plantilla.current = suPlantilla;

        const mensajes = buildLeadMessages(
          conLead.map((fila) => porId.get(fila.leadId)!),
          suPlantilla.contenido,
        );

        await cola.iniciar(mensajes);
      } catch (e) {
        setError(getErrorMessage(e, 'No se pudo empezar la tanda.'));
      } finally {
        setProcesando(false);
      }
    },
    [cola, onDespachado, userId],
  );

  /*
   * LA FILA DEL QUE ESTA ABIERTO AHORA.
   *
   * La cola trabaja con mensajes y no con pasos de flujo: el puente entre los
   * dos es el mismo `grupo` que usa `onAbierto`, indexado por lead.
   */
  const filaEnCurso = useCallback(() => {
    const id = cola.actual?.lead.id;
    return id ? grupo.current.get(id) : undefined;
  }, [cola.actual]);

  /*
   * En las dos: si falla, NO se avanza.
   *
   * Avanzar igual dejaria al lead marcado a medias y ya fuera de la pantalla,
   * sin nada que delatara que la marca no llego a guardarse. Quedandose donde
   * esta, el error se ve y se puede volver a intentar sobre el mismo.
   */
  const marcarSinWhatsApp = useCallback(async () => {
    const fila = filaEnCurso();
    if (!fila) return;

    setError('');
    try {
      await marcarPasoSinWhatsApp(fila.progressId);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo marcar el numero como sin WhatsApp.'));
      return;
    }
    // El registro que se escribio al abrir el chat dejo de contar: el cupo del
    // dia tiene que reflejarlo o el tope frenaria antes de tiempo.
    onRevertido();
    await cola.avanzar();
  }, [cola, filaEnCurso, onRevertido]);

  const sacarPorNoContactar = useCallback(
    async (nota: string) => {
      const fila = filaEnCurso();
      if (!fila) return;

      setError('');
      try {
        await exitEnrollment(fila.enrollmentId, 'no_contactar', nota);
      } catch (e) {
        setError(getErrorMessage(e, 'No se pudo sacar al lead del flujo.'));
        return;
      }
      await cola.avanzar();
    },
    [cola, filaEnCurso],
  );

  return { cola, procesando, error, ultimoResultado, despacharGrupo, marcarSinWhatsApp, sacarPorNoContactar };
}
