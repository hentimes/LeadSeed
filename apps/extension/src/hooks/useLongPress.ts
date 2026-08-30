import { useCallback, useEffect, useRef } from 'react';

/**
 * PULSACION LARGA
 *
 * Existe porque los controles de cada mensaje aparecen con `group-hover`, y en
 * una pantalla tactil no hay hover: hoy son sencillamente inalcanzables desde
 * un telefono o una pantalla tactil. La pulsacion larga es el gesto que usa
 * WhatsApp para lo mismo.
 *
 * ## Por que no toca el DOM
 *
 * Solo usa `setTimeout` y refs, y devuelve manejadores que el componente ata a
 * su elemento. Eso lo mantiene dentro de las reglas de `src/hooks/**`, que
 * tiene prohibidos `window` y `document` por la frontera de portabilidad a
 * movil (ver eslint.config.js): en React Native estos mismos manejadores se
 * cambian por los de `Pressable` sin tocar la logica.
 *
 * ## Por que `pointer` y no `touch`
 *
 * Los eventos de puntero cubren dedo, lapiz y raton con una sola familia. Con
 * `touchstart` habria que duplicar todo para el raton, y el gesto tambien es
 * util con el raton: mantener apretado es mas descubrible que buscar un boton
 * que aparece al pasar por encima.
 */

/** Cuanto hay que mantener apretado. Por debajo de 400ms se dispara sin querer. */
const DURACION_POR_DEFECTO = 450;

/** Cuanto se puede mover el dedo antes de que deje de ser una pulsacion. */
const TOLERANCIA_DE_MOVIMIENTO = 10;

export interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}

export function useLongPress(
  onLongPress: () => void,
  duracion = DURACION_POR_DEFECTO
): LongPressHandlers {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origen = useRef<{ x: number; y: number } | null>(null);

  const cancelar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    origen.current = null;
  }, []);

  // Sin esto, desmontar el mensaje con el dedo apretado deja el temporizador
  // vivo y dispara sobre un componente que ya no existe.
  useEffect(() => cancelar, [cancelar]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      cancelar();
      origen.current = { x: event.clientX, y: event.clientY };
      temporizador.current = setTimeout(() => {
        temporizador.current = null;
        onLongPress();
      }, duracion);
    },
    [cancelar, duracion, onLongPress]
  );

  /*
   * Si el dedo se movio, no era una pulsacion: era el arranque de un scroll.
   * Sin esta comprobacion, recorrer la conversacion abre los controles de
   * cualquier mensaje que se toque al pasar.
   */
  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const inicio = origen.current;
      if (!inicio) return;

      const recorrido = Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y);
      if (recorrido > TOLERANCIA_DE_MOVIMIENTO) cancelar();
    },
    [cancelar]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancelar,
    onPointerLeave: cancelar,
    onPointerCancel: cancelar,
  };
}
