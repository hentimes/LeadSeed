/**
 * Avatar de respaldo cuando la persona no subio foto.
 *
 * Antes esto era una URL a `ui-avatars.com` copiada literalmente en siete
 * sitios. Tres problemas, y el que menos importa es la duplicacion:
 *
 * 1. Sin conexion no se ve nada. La extension se usa a diario y la red se cae.
 * 2. Cada avatar mandaba el nombre de la persona a un tercero. Nadie lo pidio
 *    y no aporta nada: las iniciales se calculan aqui.
 * 3. Si ese servicio cambia o desaparece, se rompen las siete pantallas a la vez.
 *
 * Ahora se dibuja localmente como SVG en un `data:` URI. Se conservan el fondo
 * azul y el texto blanco que ya tenia, para que no cambie de aspecto.
 */

const FONDO = '#3b82f6';
const TINTA = '#ffffff';
const LADO = 128;

/** Hasta dos iniciales, en mayuscula. `'Ana Perez'` da `'AP'`. */
export function inicialesDe(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => /\p{L}/u.test(p));
  if (palabras.length === 0) return '?';
  const letras = palabras.slice(0, 2).map((p) => Array.from(p)[0]);
  return letras.join('').toLocaleUpperCase('es');
}

/**
 * SVG en `data:` URI con las iniciales centradas.
 *
 * Va codificado con `encodeURIComponent` y no en base64 a proposito: `btoa`
 * revienta con acentos, que en nombres en español son la norma.
 */
export function avatarDeIniciales(nombre: string, fondo = FONDO, tinta = TINTA): string {
  const iniciales = inicialesDe(nombre)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">` +
    `<rect width="${LADO}" height="${LADO}" fill="${fondo}"/>` +
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="${tinta}"` +
    ` font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif"` +
    ` font-size="${LADO * 0.42}" font-weight="600">${iniciales}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** La foto de la persona si la hay; si no, las iniciales dibujadas aqui. */
export function avatarUrl(nombre: string | null | undefined, fotoUrl?: string | null): string {
  if (fotoUrl) return fotoUrl;
  return avatarDeIniciales(nombre || 'Usuario');
}
