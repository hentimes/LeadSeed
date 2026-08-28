/**
 * FORMATO DEL CUERPO DE UNA PUBLICACION
 *
 * El cuerpo se guarda como TEXTO PLANO con un marcado acotado, y se dibuja
 * convirtiendolo a tokens que React pinta con etiquetas que elige este modulo.
 * En ningun punto del recorrido hay una cadena de HTML.
 *
 * ## Por que no HTML, ni siquiera saneado
 *
 * Este texto lo escribe una persona y lo leen todas las demas: cualquier
 * camino que termine en `dangerouslySetInnerHTML` con contenido de usuario es
 * un XSS almacenado, y basta un descuido en la configuracion del saneador para
 * abrirlo. Al no existir nunca una cadena de HTML, ese fallo no se puede
 * cometer aunque alguien lo intente mas adelante.
 *
 * La alternativa era una libreria de markdown. Se descarto por peso: es una
 * extension de Chrome y el panel se carga entero en cada apertura. `marked` son
 * ~5 KB pero igual devuelve HTML que hay que sanear; `react-markdown` arrastra
 * unified/remark/micromark, entre 30 y 50 KB comprimidos.
 *
 * ## Compatibilidad con lo ya publicado
 *
 * No hace falta migrar nada. La sintaxis es aditiva y ninguno de sus
 * marcadores tenia significado antes: un cuerpo viejo sin marcas produce un
 * unico parrafo con su texto tal cual, que es exactamente como se veia.
 */

/** Un trozo de texto dentro de una linea. */
export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'link'; label: string; href: string };

export type PostBlock =
  | { type: 'heading'; level: 1 | 2; inline: InlineToken[] }
  | { type: 'list'; items: InlineToken[][] }
  | { type: 'hr' }
  | { type: 'paragraph'; inline: InlineToken[] };

/**
 * Esquemas de enlace permitidos.
 *
 * Es una lista blanca y no una lista negra a proposito. Con lista negra hay que
 * acertar a prohibir `javascript:`, `data:`, `vbscript:`, `blob:`, `file:` y lo
 * que invente el proximo navegador; con lista blanca, lo que no esta escrito
 * aca simplemente no es un enlace.
 */
const ESQUEMAS_PERMITIDOS = ['http:', 'https:', 'mailto:'];

/**
 * `true` si la direccion se puede usar como destino de un enlace.
 *
 * Se usa `URL` y no una expresion regular: interpretar un esquema a mano falla
 * con los trucos clasicos (`java\tscript:`, `JaVaScRiPt:`, espacios delante),
 * porque el navegador normaliza antes de navegar y una regex ingenua no.
 */
export function isSafeHref(href: string): boolean {
  try {
    // La base hace que las rutas relativas se resuelvan en vez de lanzar; el
    // esquema resultante seria `https:` y se acepta, que es lo correcto.
    const url = new URL(href, 'https://leadseed.invalid');
    return ESQUEMAS_PERMITIDOS.includes(url.protocol);
  } catch {
    return false;
  }
}

/** `**negrita**` y `[etiqueta](url)`. El orden importa: gana el que empiece antes. */
const PATRON_INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]{1,120})\]\(([^)\s]{1,500})\)/g;

function parseInline(linea: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let ultimo = 0;

  for (const match of linea.matchAll(PATRON_INLINE)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimo) tokens.push({ type: 'text', value: linea.slice(ultimo, inicio) });

    const [completo, negrita, etiqueta, destino] = match;

    if (negrita) {
      tokens.push({ type: 'bold', value: negrita });
    } else if (etiqueta && destino) {
      /*
       * Un enlace con un esquema no permitido NO se descarta en silencio: se
       * degrada a texto, con la direccion a la vista. Asi quien lea ve que
       * habia algo raro, en vez de encontrarse una etiqueta inocente que no
       * hace nada.
       */
      if (isSafeHref(destino)) {
        tokens.push({ type: 'link', label: etiqueta, href: destino });
      } else {
        tokens.push({ type: 'text', value: `${etiqueta} (${destino})` });
      }
    }

    ultimo = inicio + completo.length;
  }

  if (ultimo < linea.length) tokens.push({ type: 'text', value: linea.slice(ultimo) });

  return tokens;
}

/** Solo cuenta como encabezado si hay un espacio: `#etiqueta` es texto. */
const ENCABEZADO = /^(#{1,2}) +(.*)$/;
const VINETA = /^- +(.*)$/;
const SEPARADOR = /^-{3,}$/;

/**
 * Convierte el cuerpo guardado en bloques listos para dibujar.
 *
 * Nunca lanza y nunca devuelve nada a medias: un marcador sin cerrar
 * (`**negrita` sin el par, `[texto](` incompleto) se queda como texto normal.
 * El cuerpo de una publicacion no puede romper la pantalla de quien la lee.
 */
export function parseBody(body: string): PostBlock[] {
  const bloques: PostBlock[] = [];
  const lineas = body.replace(/\r\n/g, '\n').split('\n');

  let parrafo: string[] = [];
  let vinetas: InlineToken[][] = [];

  const cerrarParrafo = () => {
    if (parrafo.length === 0) return;
    bloques.push({ type: 'paragraph', inline: parseInline(parrafo.join('\n')) });
    parrafo = [];
  };

  const cerrarLista = () => {
    if (vinetas.length === 0) return;
    bloques.push({ type: 'list', items: vinetas });
    vinetas = [];
  };

  for (const linea of lineas) {
    const limpia = linea.trimEnd();

    // El separador se comprueba ANTES que la vineta: `---` tambien encaja con
    // "guion seguido de algo" si no se ordenan bien.
    if (SEPARADOR.test(limpia.trim())) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ type: 'hr' });
      continue;
    }

    const encabezado = ENCABEZADO.exec(limpia);
    if (encabezado) {
      cerrarParrafo();
      cerrarLista();
      const [, almohadillas, texto] = encabezado;
      bloques.push({
        type: 'heading',
        level: almohadillas?.length === 1 ? 1 : 2,
        inline: parseInline(texto ?? ''),
      });
      continue;
    }

    const vineta = VINETA.exec(limpia);
    if (vineta) {
      cerrarParrafo();
      vinetas.push(parseInline(vineta[1] ?? ''));
      continue;
    }

    // Una linea en blanco separa bloques; dentro de un parrafo, el salto se
    // conserva.
    if (limpia.trim() === '') {
      cerrarParrafo();
      cerrarLista();
      continue;
    }

    cerrarLista();
    parrafo.push(limpia);
  }

  cerrarParrafo();
  cerrarLista();

  return bloques;
}

/**
 * El cuerpo sin marcas, para donde no se puede dibujar formato.
 *
 * Lo usa la tarjeta del feed, que recorta el cuerpo a dos lineas: ahi los
 * asteriscos y las almohadillas se verian crudos ("**importante**"), que es
 * peor que no tener formato. Reusa el parser en vez de quitar los simbolos con
 * una expresion regular, para que no haya dos ideas distintas de que es una
 * marca.
 */
export function toPlainBody(body: string): string {
  const texto = (tokens: InlineToken[]) =>
    tokens
      .map((token) => (token.type === 'link' ? token.label : token.value))
      .join('');

  return parseBody(body)
    .map((bloque) => {
      if (bloque.type === 'hr') return '';
      if (bloque.type === 'list') return bloque.items.map((item) => `• ${texto(item)}`).join(' ');
      return texto(bloque.inline);
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}
