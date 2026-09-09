import type { KeyboardEvent } from 'react';

/**
 * Convierte un elemento no interactivo en uno operable con teclado.
 *
 * ## Por que hace falta
 *
 * Un `<div onClick>` no es un boton: no entra en el orden de tabulacion, no
 * responde a Enter ni a la barra espaciadora, y un lector de pantalla lo
 * anuncia como texto suelto. Quien no usa raton simplemente no puede
 * activarlo.
 *
 * `ListRow` ya resolvia esto para las filas de lista. Se extrae aqui al
 * aparecer la cuarta copia del mismo patron: las tarjetas de metrica, las de
 * alerta y las filas del embudo del panel navegan a Leads y a Pipeline con un
 * `div onClick` pelado, asi que esas tres superficies del panel no se podian
 * recorrer sin raton.
 *
 * ## Cuando NO usarlo
 *
 * Solo si el elemento hace algo al pulsarlo. Un elemento decorativo que reciba
 * foco roba una parada de tabulacion a cambio de nada, que es empeorar el
 * recorrido en vez de arreglarlo. Por eso devuelve un objeto vacio cuando no
 * hay `onClick`.
 *
 * ## Cuando preferir un `<button>`
 *
 * Siempre que se pueda. Esto es para los casos en que el contenido no cabe
 * dentro de un boton -una fila de tabla, una tarjeta con su propia rejilla- o
 * en que cambiar la etiqueta rompe la maquetacion existente.
 */
export function propsDeClicable(onClick?: () => void) {
  if (typeof onClick !== 'function') return {};

  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (evento: KeyboardEvent<HTMLElement>) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      // La barra espaciadora scrollea la pagina si no se corta aqui.
      evento.preventDefault();
      onClick();
    },
  };
}
