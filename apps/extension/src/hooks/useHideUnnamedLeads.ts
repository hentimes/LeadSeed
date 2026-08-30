/**
 * El interruptor de "ocultar leads sin nombre", recordado en la cuenta.
 *
 * Antes era un `useState` suelto repetido en tres sitios -la tabla de leads, el
 * pipeline y el panel de flujos-, asi que cada pantalla tenia su propia copia:
 * apagarlo en una no lo apagaba en las otras, y cambiar de seccion lo reiniciaba
 * sin que nadie lo tocara. Encima se perdia al cerrar el panel.
 *
 * Al vivir en `AppSettings` -que se guarda en `profiles`- pasa a ser lo que
 * siempre fue: una preferencia de trabajo, no un estado de pantalla. Quien
 * oculta los leads sin nombre no quiere verlos, y punto, no "no quiere verlos en
 * esta pestaña durante los proximos diez minutos".
 */

import { useCallback, useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../services/appSettingsService';

export function useHideUnnamedLeads(): [boolean, (valor: boolean) => void] {
  const [ocultar, setOcultar] = useState(false);

  useEffect(() => {
    let cancelado = false;

    getSettings()
      .then((ajustes) => {
        if (cancelado) return;
        setOcultar(ajustes.hideUnnamedLeads);
      })
      .catch(() => {
        // Si no se pueden leer los ajustes se deja el valor por defecto, que es
        // mostrarlo todo. Fallar hacia "ocultar" escondería filas que el usuario
        // no pidio esconder, y eso es como se pierden contactos de vista.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const cambiar = useCallback((valor: boolean) => {
    // Optimista: el interruptor responde al momento y el guardado va detras. Es
    // una preferencia visual, asi que si el guardado falla lo peor que pasa es
    // que la proxima sesion empiece como antes.
    setOcultar(valor);

    void (async () => {
      try {
        const ajustes = await getSettings();
        await saveSettings({ ...ajustes, hideUnnamedLeads: valor });
      } catch {
        // Sin ruido en la interfaz: no merece un aviso de error a pantalla
        // completa por no haber recordado un interruptor.
      }
    })();
  }, []);

  return [ocultar, cambiar];
}
