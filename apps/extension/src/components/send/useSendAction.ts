import { useEffect, useRef } from 'react';
import type { SendActionState } from './channels';

/**
 * Publica en el pie fijo como tiene que verse el boton primario de este canal.
 *
 * ## Por que no es un `useEffect` suelto en cada sender
 *
 * La version directa tiene un fallo silencioso. El efecto solo puede depender
 * del rotulo y del motivo pendiente -si dependiera de `onTrigger`, que es una
 * funcion nueva en cada render, se dispararia sin parar-, asi que el handler
 * que queda guardado en el padre es el del ultimo render en que ALGUNO DE ESOS
 * DOS cambio.
 *
 * Y eso rompe de verdad en Llamadas: con el guion y el lead ya elegidos, el
 * rotulo es fijo ("Registrar llamada completada") y el motivo pendiente es
 * `null`. Si despues se cambia de lead, ninguno de los dos cambia, el efecto no
 * vuelve a correr, y el boton sigue apuntando al handler viejo: **registraria
 * la llamada al lead anterior**. Un dato equivocado guardado en silencio, que
 * es lo peor que puede pasar en esta pantalla.
 *
 * La solucion es la de siempre para un closure obsoleto: lo que se publica no
 * es el handler, sino un envoltorio estable que lee el handler de turno desde
 * una `ref`. El efecto puede seguir dependiendo de dos primitivas, y el boton
 * siempre ejecuta el del render actual.
 */
export function useSendAction(
  onActionChange: (action: SendActionState) => void,
  label: string,
  razonPendiente: SendActionState['razonPendiente'],
  onTrigger: () => void,
) {
  const triggerRef = useRef(onTrigger);
  const avisarRef = useRef(onActionChange);

  // Sin arreglo de dependencias: se sincronizan despues de cada render, que es
  // justo lo que hace falta para que la `ref` nunca quede atrasada.
  useEffect(() => {
    triggerRef.current = onTrigger;
    avisarRef.current = onActionChange;
  });

  useEffect(() => {
    avisarRef.current({
      label,
      razonPendiente,
      // Estable: no cambia de identidad, y siempre llama al handler de turno.
      onTrigger: () => triggerRef.current(),
    });
  }, [label, razonPendiente]);
}
