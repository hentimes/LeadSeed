/**
 * PALETA DE LAS LISTAS DEL USUARIO
 *
 * Vivia dentro de `ListsPage.tsx`. Se movio aca porque ahora la necesitan dos
 * sitios -la fila de creacion y el selector de color- y una constante compartida
 * no puede vivir dentro de una pagina.
 *
 * Estos hexadecimales son una de las tres excepciones legitimas a la regla de
 * "ningun color literal" que documenta `design/README.md`: son colores que
 * ELIGE el usuario para sus listas, o sea datos, no estilo. Por eso se aplican
 * con `style={{ backgroundColor }}` y no con una clase: una clase de Tailwind
 * armada en tiempo de ejecucion nunca se genera.
 *
 * El orden importa: estaban agrupados de a cinco porque el selector anterior
 * paginaba de a cinco. Ese paginado ya no existe, pero los grupos se conservan
 * porque alternan claros y oscuros y hacen que la grilla se lea ordenada.
 */
export interface ListColor {
  hex: string;
  name: string;
}

export const AVAILABLE_COLORS: ListColor[] = [
  // Claros y primarios
  { hex: '#FFFFFF', name: 'Blanco' },
  { hex: '#EF4444', name: 'Rojo Claro' },
  { hex: '#22C55E', name: 'Verde Claro' },
  { hex: '#3B82F6', name: 'Azul Claro' },
  { hex: '#FBBF24', name: 'Amarillo' },

  // Oscuros y secundarios
  { hex: '#000000', name: 'Negro' },
  { hex: '#991B1B', name: 'Rojo Oscuro' },
  { hex: '#166534', name: 'Verde Oscuro' },
  { hex: '#1E40AF', name: 'Azul Oscuro' },
  { hex: '#F97316', name: 'Naranja' },

  // Claros y terciarios
  { hex: '#94A3B8', name: 'Gris Claro' },
  { hex: '#EC4899', name: 'Rosado Claro' },
  { hex: '#06B6D4', name: 'Cyan Claro' },
  { hex: '#14B8A6', name: 'AquaMarina Claro' },
  { hex: '#A855F7', name: 'Morado Claro' },

  // Oscuros y terciarios
  { hex: '#475569', name: 'Gris Oscuro' },
  { hex: '#BE185D', name: 'Rosado Oscuro' },
  { hex: '#155E75', name: 'Cyan Oscuro' },
  { hex: '#0F766E', name: 'AquaMarina Oscuro' },
  { hex: '#6B21A8', name: 'Morado Oscuro' },
];

/** El de una lista nueva: el morado de la marca. */
export const DEFAULT_LIST_COLOR = '#6C4CF6';

/** El nombre del color, para el tooltip y el lector de pantalla. */
export function nombreDeColor(hex: string): string {
  return AVAILABLE_COLORS.find((color) => color.hex === hex)?.name ?? 'Color personalizado';
}

/**
 * Colores que NO se sortean al crear una lista.
 *
 * El blanco desaparece sobre la superficie -solo sobrevive por el borde
 * prestado que le pone el selector- y el negro se confunde con el color del
 * texto. Elegirlos a mano es legitimo; que le toquen a alguien sin mirar, no:
 * un punto de color que no se distingue no identifica nada.
 */
const NO_SE_SORTEAN = ['#FFFFFF', '#000000'];

/**
 * Un color al azar para una lista nueva.
 *
 * `random` se recibe en vez de llamar a `Math.random` adentro para que la
 * funcion se pueda probar: con un generador fijo el resultado es determinista.
 *
 * `usados` evita que dos listas seguidas salgan del mismo color, que es lo que
 * pasaria sorteando sobre la paleta entera. Si ya se usaron todos, se sortea
 * igual sobre todos: repetir es mejor que fallar.
 */
export function elegirColorAlAzar(
  usados: string[] = [],
  random: () => number = Math.random,
  colores: ListColor[] = AVAILABLE_COLORS
): string {
  const sorteables = colores.filter((color) => !NO_SE_SORTEAN.includes(color.hex));
  const libres = sorteables.filter((color) => !usados.includes(color.hex));
  const candidatos = libres.length > 0 ? libres : sorteables;

  const elegido = candidatos[Math.floor(random() * candidatos.length)];
  return elegido?.hex ?? DEFAULT_LIST_COLOR;
}
