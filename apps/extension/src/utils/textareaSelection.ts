/**
 * INSERTAR MARCAS EN LA POSICION DEL CURSOR
 *
 * Lo que hace la barra de herramientas del editor de publicaciones cuando se
 * toca "negrita", "viñeta" o "encabezado". Vive aparte del componente y sin
 * tocar el DOM porque es la parte con reglas que se pueden equivocar en
 * silencio -donde queda el cursor despues, que pasa si no hay nada
 * seleccionado, si la marca ya estaba puesta- y asi se puede probar sin montar
 * React.
 *
 * Todas las funciones devuelven el texto nuevo Y donde tiene que quedar la
 * seleccion. Devolver solo el texto es el error clasico de este patron: el
 * cursor salta al final y hay que volver a buscar el sitio a mano.
 */

export interface SelectionResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Envuelve la seleccion con un marcador, o lo quita si ya estaba.
 *
 * Sin seleccion inserta el par y deja el cursor en el medio, que es lo que
 * espera quien toca "negrita" antes de escribir.
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  marker: string
): SelectionResult {
  const seleccionado = text.slice(start, end);
  const antes = text.slice(0, start);
  const despues = text.slice(end);

  // Ya estaba envuelto: se quita. Es lo que convierte al boton en interruptor
  // en vez de acumular `****negrita****` a cada toque.
  if (
    seleccionado.length > 0 &&
    antes.endsWith(marker) &&
    despues.startsWith(marker)
  ) {
    return {
      text: antes.slice(0, -marker.length) + seleccionado + despues.slice(marker.length),
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }

  if (seleccionado.length === 0) {
    return {
      text: `${antes}${marker}${marker}${despues}`,
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length,
    };
  }

  return {
    text: `${antes}${marker}${seleccionado}${marker}${despues}`,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  };
}

/** Principio de la linea donde esta el cursor. */
function inicioDeLinea(text: string, cursor: number): number {
  const salto = text.lastIndexOf('\n', Math.max(0, cursor - 1));
  return salto === -1 ? 0 : salto + 1;
}

/**
 * Pone o quita un prefijo de linea (`# `, `## `, `- `).
 *
 * Si la linea ya tiene OTRO prefijo de la lista, se reemplaza en vez de
 * apilarse: pasar de encabezado 1 a encabezado 2 no debe dejar `# ## `.
 */
export function toggleLinePrefix(
  text: string,
  cursor: number,
  prefix: string,
  /** Prefijos que se consideran del mismo grupo y por lo tanto se reemplazan. */
  exclusivos: string[] = ['# ', '## ', '- ']
): SelectionResult {
  const inicio = inicioDeLinea(text, cursor);
  const finSalto = text.indexOf('\n', inicio);
  const fin = finSalto === -1 ? text.length : finSalto;
  const linea = text.slice(inicio, fin);

  const actual = exclusivos.find((candidato) => linea.startsWith(candidato));

  // El mismo prefijo dos veces lo quita.
  if (actual === prefix) {
    const nueva = linea.slice(prefix.length);
    return {
      text: text.slice(0, inicio) + nueva + text.slice(fin),
      selectionStart: Math.max(inicio, cursor - prefix.length),
      selectionEnd: Math.max(inicio, cursor - prefix.length),
    };
  }

  const sinPrefijo = actual ? linea.slice(actual.length) : linea;
  const nueva = prefix + sinPrefijo;
  const desplazamiento = prefix.length - (actual?.length ?? 0);

  return {
    text: text.slice(0, inicio) + nueva + text.slice(fin),
    selectionStart: Math.max(inicio, cursor + desplazamiento),
    selectionEnd: Math.max(inicio, cursor + desplazamiento),
  };
}

/**
 * Inserta una linea propia (la horizontal) despues de la linea actual.
 *
 * Se asegura de que quede sola: si la linea de arriba tiene texto, agrega el
 * salto que falta. Una `---` pegada a un parrafo no es un separador para el
 * parser, es texto.
 */
export function insertBlockLine(text: string, cursor: number, line: string): SelectionResult {
  const inicio = inicioDeLinea(text, cursor);
  const finSalto = text.indexOf('\n', inicio);
  const fin = finSalto === -1 ? text.length : finSalto;

  const antes = text.slice(0, fin);
  const despues = text.slice(fin);

  const bloque = `${antes.length > 0 ? '\n' : ''}${line}\n`;
  const posicion = antes.length + bloque.length;

  return {
    text: antes + bloque + despues.replace(/^\n/, ''),
    selectionStart: posicion,
    selectionEnd: posicion,
  };
}

/**
 * Inserta un enlace con el formato del parser.
 *
 * Si habia texto seleccionado, pasa a ser la etiqueta. Si no, se usa la propia
 * direccion, que es mejor que dejar `[]()` vacio para que alguien lo rellene.
 */
export function insertLink(
  text: string,
  start: number,
  end: number,
  href: string,
  label?: string
): SelectionResult {
  const seleccionado = text.slice(start, end);
  const etiqueta = label?.trim() || seleccionado || href;
  const marca = `[${etiqueta}](${href})`;

  return {
    text: text.slice(0, start) + marca + text.slice(end),
    selectionStart: start + marca.length,
    selectionEnd: start + marca.length,
  };
}
