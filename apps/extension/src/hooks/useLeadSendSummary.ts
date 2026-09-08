import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeadSendSummary, type LeadSendSummary } from '../services/historyService';

/** En que anda la carga del resumen. Ver por que importa mas abajo. */
export type EstadoDelResumen = 'cargando' | 'listo' | 'error';

export interface ResumenDeEnvios {
  resumen: Map<string, LeadSendSummary>;
  estado: EstadoDelResumen;
}

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
 *
 * ## Por que ademas hace falta el estado, y no solo el mapa
 *
 * Lo de arriba valia cuando esto solo pintaba una cifra al costado de cada
 * fila. Dejo de valer cuando el mismo dato paso a alimentar el filtro de "a
 * quien todavia no le escribi": ahi un mapa vacio no significa "todavia no
 * llego", significa "a nadie se le escribio nunca". Con la consulta en vuelo
 * -o caida- ese filtro devolveria la agenda entera y el usuario mandaria el
 * mismo mensaje por segunda vez a mil personas.
 *
 * O sea que el mapa vacio es un valor por defecto seguro para PINTAR e inseguro
 * para FILTRAR. Por eso viaja acompanado del estado, y quien filtra se apaga
 * hasta que este en 'listo'.
 */
export function useLeadSendSummary(): ResumenDeEnvios {
  const [resumen, setResumen] = useState<Map<string, LeadSendSummary>>(new Map());
  const [estado, setEstado] = useState<EstadoDelResumen>('cargando');
  const { user } = useAuth();

  useEffect(() => {
    let cancelado = false;

    if (!user) {
      setResumen(new Map());
      // Sin sesion no hay nada que cargar ni nada que esperar: el resumen esta
      // completo y es vacio. Dejarlo en 'cargando' apagaria el filtro para
      // siempre en una pantalla que igual no se puede usar sin sesion.
      setEstado('listo');
      return;
    }

    setEstado('cargando');
    void (async () => {
      try {
        const siguiente = await fetchLeadSendSummary();
        if (cancelado) return;
        setResumen(siguiente);
        setEstado('listo');
      } catch {
        // El detalle ya se registro en el repositorio. Aca solo interesa que la
        // pantalla sepa que lo que tiene no es de fiar.
        if (cancelado) return;
        setResumen(new Map());
        setEstado('error');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [user]);

  return { resumen, estado };
}
