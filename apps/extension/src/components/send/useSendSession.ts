import { useCallback, useEffect, useState } from 'react';
import { countSendsToday } from '../../services/sendService';

type Canal = 'whatsapp' | 'email' | 'call';

interface UltimaSeleccion {
  categoriaId: number | null;
  plantillaId: string | null;
}

const CLAVE = 'ls.envio.ultimaSeleccion';

/**
 * Ultima categoria y plantilla usadas, por canal.
 *
 * El compositor arrancaba siempre en blanco: quien manda la misma plantilla
 * decenas de veces al dia tenia que volver a elegir categoria y plantilla en
 * cada visita a Mensajes.
 *
 * Por canal y no global: la plantilla de WhatsApp no sirve para el correo, y
 * restaurar una del canal equivocado seria peor que no restaurar nada.
 */
function leerSeleccion(canal: Canal): UltimaSeleccion {
  try {
    const crudo = localStorage.getItem(`${CLAVE}.${canal}`);
    if (!crudo) return { categoriaId: null, plantillaId: null };

    const guardado = JSON.parse(crudo) as Partial<UltimaSeleccion>;
    return {
      categoriaId: typeof guardado.categoriaId === 'number' ? guardado.categoriaId : null,
      plantillaId: typeof guardado.plantillaId === 'string' ? guardado.plantillaId : null,
    };
  } catch {
    // Un valor corrupto no puede dejar la pantalla sin abrir.
    return { categoriaId: null, plantillaId: null };
  }
}

function guardarSeleccion(canal: Canal, seleccion: UltimaSeleccion): void {
  try {
    localStorage.setItem(`${CLAVE}.${canal}`, JSON.stringify(seleccion));
  } catch {
    // Sin almacenamiento se sigue pudiendo enviar, solo que sin memoria.
  }
}

export interface SendSession {
  /** Lo guardado, para restaurar al montar. Se lee una sola vez. */
  ultima: UltimaSeleccion;
  recordar: (seleccion: UltimaSeleccion) => void;
  /** Cuantos se enviaron hoy por este canal. */
  enviadosHoy: number;
  refrescarContador: () => Promise<void>;
}

/**
 * Memoria del compositor entre visitas: que plantilla se estaba usando y
 * cuantos mensajes van hoy.
 *
 * El contador sale de `send_logs` y no de un numero en memoria: tiene que
 * sobrevivir a cerrar el panel, que es justo lo que pasa entre envio y envio.
 */
export function useSendSession(canal: Canal): SendSession {
  const [ultima] = useState(() => leerSeleccion(canal));
  const [enviadosHoy, setEnviadosHoy] = useState(0);

  const refrescarContador = useCallback(async () => {
    try {
      setEnviadosHoy(await countSendsToday(canal));
    } catch {
      // El contador es informativo: si falla la consulta no se interrumpe el
      // envio ni se pinta un error, se queda con el ultimo valor conocido.
    }
  }, [canal]);

  useEffect(() => {
    void refrescarContador();
  }, [refrescarContador]);

  const recordar = useCallback(
    (seleccion: UltimaSeleccion) => guardarSeleccion(canal, seleccion),
    [canal],
  );

  return { ultima, recordar, enviadosHoy, refrescarContador };
}
