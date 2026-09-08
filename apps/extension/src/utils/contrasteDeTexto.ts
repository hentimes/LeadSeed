/**
 * QUE COLOR DE TEXTO PONER ENCIMA DE UN COLOR ELEGIDO POR EL USUARIO
 *
 * Los colores de las listas y de los estados de lead los elige quien usa la
 * app: son dato, no estilo, y por eso viajan como hexadecimal en la base -ver
 * `config/colors.ts`-. Las pastillas que los pintan de fondo llevaban el texto
 * en blanco fijo, y sobre un amarillo o un verde menta eso queda en 2:1 largos,
 * o sea ilegible e incumpliendo el 4.5:1 de WCAG 1.4.3.
 *
 * No se puede arreglar acotando la paleta sin quitarle al usuario el color que
 * eligio. Lo que si se puede es decidir el color del TEXTO en funcion del
 * fondo, que es lo unico que hace falta para que se lea.
 *
 * ## Por que luminancia relativa y no el promedio de los canales
 *
 * El ojo no pesa igual los tres canales: un verde puro se ve mucho mas claro
 * que un azul puro con el mismo valor. La formula de luminancia relativa de
 * WCAG 2.x -con la correccion de gamma- es la que usan los propios criterios de
 * contraste, asi que decidir con ella da el mismo veredicto que daria una
 * herramienta de auditoria.
 *
 * El umbral 0.179 es el punto en el que el negro y el blanco empatan contra el
 * mismo fondo: por debajo gana el blanco, por encima gana el negro. Sale de
 * resolver `(L + 0.05) / 0.05 = 1.05 / (L + 0.05)`.
 */

const UMBRAL = 0.179;

/**
 * Texto oscuro y claro. Literales a proposito: no cambian con el tema, porque
 * el fondo tampoco -es el color guardado del usuario, igual en claro y en
 * oscuro-.
 *
 * El oscuro es negro puro y no el gris tinta del sistema. El peor fondo posible
 * es un gris medio (#808080): contra el, el gris tinta se queda en 4.49:1 y
 * incumple por centesimas. Con negro puro no hay ningun color de fondo que
 * falle, y en una pastilla de una linea la dureza del negro no se nota.
 */
export const TEXTO_SOBRE_OSCURO = '#ffffff';
export const TEXTO_SOBRE_CLARO = '#000000';

/** Los tres canales de un hexadecimal, en 0..255. Nulo si no se entiende. */
function canales(hex: string): [number, number, number] | null {
  const limpio = hex.trim().replace(/^#/, '');
  const largo = limpio.length === 3
    ? limpio.split('').map((c) => c + c).join('')
    : limpio;
  if (!/^[0-9a-f]{6}$/i.test(largo)) return null;
  return [
    parseInt(largo.slice(0, 2), 16),
    parseInt(largo.slice(2, 4), 16),
    parseInt(largo.slice(4, 6), 16),
  ];
}

/** Luminancia relativa segun WCAG 2.x, de 0 (negro) a 1 (blanco). */
export function luminanciaRelativa(hex: string): number | null {
  const rgb = canales(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((canal) => {
    const s = canal / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * El color de texto que se lee sobre `fondo`.
 *
 * Un color que no se entiende devuelve texto blanco, que es lo que habia antes
 * de esto: ante un dato roto se conserva el aspecto conocido en vez de pintar
 * una pastilla que parece de otro sistema.
 */
export function textoSobre(fondo: string): string {
  const luminancia = luminanciaRelativa(fondo);
  if (luminancia === null) return TEXTO_SOBRE_OSCURO;
  return luminancia > UMBRAL ? TEXTO_SOBRE_CLARO : TEXTO_SOBRE_OSCURO;
}
