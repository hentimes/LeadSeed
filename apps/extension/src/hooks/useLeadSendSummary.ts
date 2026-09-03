import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeadSendSummary, type LeadSendSummary } from '../services/historyService';

/**
 * Que se le envio a cada lead, para decidir a quien escribirle.
 *
 * Se carga una vez por sesion del selector y no por lead: la funcion del
 * servidor devuelve una fila por lead, asi que son unos cientos de filas
 * pequenas, no una consulta por fila de la lista.
 *
 * Empieza vacio y la lista se pinta igual mientras llega. Un lead sin resumen se
 * dibuja como "sin envios", que es lo correcto tanto si nunca recibio uno como
 * si el dato todavia no llego: la diferencia dura milisegundos y la alternativa
 * -bloquear la lista con un cargador- hace esperar por un dato accesorio.
 */
export function useLeadSendSummary() {
  const [resumen, setResumen] = useState<Map<string, LeadSendSummary>>(new Map());
  const { user } = useAuth();

  useEffect(() => {
    let cancelado = false;

    if (!user) {
      setResumen(new Map());
      return;
    }

    void (async () => {
      const siguiente = await fetchLeadSendSummary();
      if (!cancelado) setResumen(siguiente);
    })();

    return () => {
      cancelado = true;
    };
  }, [user]);

  return resumen;
}
