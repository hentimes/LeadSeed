import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuanto se queda el visto bueno en pantalla. */
const MS_POR_DEFECTO = 1500;

/**
 * El "Guardado" que sustituye al boton de guardar.
 *
 * Configuracion no tiene boton de guardar: los interruptores y los selectores
 * escriben al tocarlos y los numeros al salir del campo. Eso deja al usuario
 * sin la unica senal que le decia que su cambio llego, asi que cada control
 * enciende un visto durante segundo y medio en el hueco de su derecha.
 *
 * Se extrae al aparecer la segunda copia -General y Datos-, no antes: el
 * patron son tres piezas (el estado, el temporizador que lo apaga y el
 * temporizador anterior que hay que cancelar antes) y la tercera es la que
 * siempre se olvida. Sin ella, guardar dos campos seguidos hacia que el
 * temporizador del primero apagara el visto del segundo.
 */
export interface AcuseDeGuardado {
  /** Muestra el visto para ese campo y reinicia la cuenta atras. */
  acusar: (campo: string) => void;
  /** True si el visto de ese campo esta encendido ahora mismo. */
  estaGuardado: (campo: string) => boolean;
}

export function useAcusarGuardado(duracionMs: number = MS_POR_DEFECTO): AcuseDeGuardado {
  /*
   * Un conjunto de campos, no un campo unico.
   *
   * Con un solo `string` bastaba tabular de "WhatsApp/dia" a "Emails/dia" para
   * que el visto del primero desapareciera al encenderse el del segundo, en
   * vez de aguantar su segundo y medio. Cada campo lleva su cuenta atras.
   */
  const [guardados, setGuardados] = useState<Set<string>>(() => new Set());
  // `setTimeout` pelado y no `window.setTimeout`: esta carpeta es capa de
  // dominio y el linter le prohibe `window`, que no existe en React Native.
  // Es lo mismo que ya hace `useDismissibleToast`.
  const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Cambiar de pestana desmonta el panel: los temporizadores se van con el.
  useEffect(() => {
    const vivos = temporizadores.current;
    return () => {
      for (const temporizador of vivos.values()) clearTimeout(temporizador);
      vivos.clear();
    };
  }, []);

  const acusar = useCallback(
    (campo: string) => {
      setGuardados((actuales) => new Set(actuales).add(campo));

      const anterior = temporizadores.current.get(campo);
      if (anterior !== undefined) clearTimeout(anterior);

      temporizadores.current.set(
        campo,
        setTimeout(() => {
          temporizadores.current.delete(campo);
          setGuardados((actuales) => {
            const siguiente = new Set(actuales);
            siguiente.delete(campo);
            return siguiente;
          });
        }, duracionMs),
      );
    },
    [duracionMs],
  );

  const estaGuardado = useCallback((campo: string) => guardados.has(campo), [guardados]);

  return { acusar, estaGuardado };
}
