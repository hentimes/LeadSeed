import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Aviso temporal que se apaga solo.
 *
 * Extraido de `useLeadsPageController`, donde el mismo patron estaba escrito
 * tres veces: mostrar el aviso, programar un `setTimeout` para apagarlo y, en
 * dos de los tres casos, comprobar dentro del temporizador que el aviso siga
 * siendo el mismo antes de borrarlo.
 *
 * Esa comprobacion existia porque **los temporizadores no se cancelaban**. Si
 * aparecia un segundo aviso antes de que venciera el primero, el temporizador
 * viejo apagaba el nuevo, y la unica defensa era comparar identificadores. Aca
 * el temporizador anterior se cancela al mostrar otro aviso, asi que el
 * problema no existe y la comprobacion sobra.
 *
 * El tercer caso, el de anclar un lead, no llevaba esa defensa: anclar dos
 * leads seguidos hacia que el segundo aviso desapareciera antes de tiempo.
 *
 * Ademas se limpia al desmontar. Antes, salir de la bandeja con un aviso
 * abierto dejaba un temporizador vivo que intentaba escribir estado en un
 * componente que ya no existia.
 */
export interface DismissibleToast<T> {
  /** Aviso visible, o `null` si no hay ninguno. */
  toast: T | null;
  /** Muestra un aviso y reinicia la cuenta atras. */
  show(value: T): void;
  /** Lo apaga de inmediato, por ejemplo cuando el usuario deshace la accion. */
  dismiss(): void;
}

export function useDismissibleToast<T>(duracionMs: number): DismissibleToast<T> {
  const [toast, setToast] = useState<T | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelar = useCallback(() => {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }, []);

  const show = useCallback(
    (value: T) => {
      cancelar();
      setToast(value);
      temporizador.current = setTimeout(() => {
        temporizador.current = null;
        setToast(null);
      }, duracionMs);
    },
    [cancelar, duracionMs],
  );

  const dismiss = useCallback(() => {
    cancelar();
    setToast(null);
  }, [cancelar]);

  useEffect(() => cancelar, [cancelar]);

  return { toast, show, dismiss };
}
