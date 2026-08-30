/**
 * COLOR DE LA BURBUJA, REPARTIDO ENTRE LOS AUTORES
 *
 * ## Por que no es azar de verdad
 *
 * El pedido era que el color fuera aleatorio. Sorteado en cada pintado, el
 * color cambiaria en cada render -al llegar un mensaje, al reaccionar, al
 * abrir un menu- y la conversacion parpadearia entera. Sorteado por mensaje,
 * dos mensajes seguidos de la misma persona saldrian de colores distintos.
 *
 * Asi que se sortea UNA VEZ POR AUTOR, y el sorteo es su identificador: el
 * reparto se ve igual de arbitrario, pero es estable entre renders, entre
 * sesiones y entre dispositivos, sin guardar nada.
 *
 * Y de yapa resuelve algo que el propio comentario de `ChatMessageBubble` daba
 * por perdido: que "habia que buscar el avatar para saber quien hablaba". Con
 * un color por persona, el autor se reconoce sin leer el nombre.
 *
 * ## El hash
 *
 * FNV-1a de 32 bits. No hace falta que sea criptografico -no protege nada-,
 * solo que reparta parejo y que sea el mismo en todas partes. `>>> 0` mantiene
 * el numero sin signo, porque en JavaScript los operadores de bits trabajan
 * sobre enteros con signo y sin eso el resto podria salir negativo.
 */

/** Cuantos fondos hay definidos en `tokens.css` como `--ls-bubble-N`. */
export const TOTAL_COLORES_DE_BURBUJA = 8;

export function indiceDeBurbuja(
  autorId: string,
  total: number = TOTAL_COLORES_DE_BURBUJA,
): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < autorId.length; i++) {
    hash ^= autorId.charCodeAt(i);
    // El primo de FNV, multiplicado con desplazamientos para no perder
    // precision: `hash * 16777619` supera el rango entero seguro.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }

  return (hash % total) + 1;
}

/** La variable CSS del fondo que le toca a este autor. */
export function colorDeBurbuja(autorId: string): string {
  return `var(--ls-bubble-${indiceDeBurbuja(autorId)})`;
}
