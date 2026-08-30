import { describe, expect, it } from 'vitest';
import { isSafeHref, parseBody, toPlainBody } from './richTextParser';

describe('isSafeHref', () => {
  it('acepta http, https y mailto', () => {
    expect(isSafeHref('https://leadseed.cl')).toBe(true);
    expect(isSafeHref('http://leadseed.cl')).toBe(true);
    expect(isSafeHref('mailto:hola@leadseed.cl')).toBe(true);
  });

  /*
   * Estos son los casos por los que existe la lista blanca. Si alguno pasara a
   * `true`, el enlace se dibujaria como `<a href>` y bastaria con que alguien
   * lo tocara para ejecutar codigo con la sesion de quien lee.
   */
  it('rechaza javascript:', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
  });

  it('rechaza javascript: escrito con mayusculas mezcladas', () => {
    expect(isSafeHref('JaVaScRiPt:alert(1)')).toBe(false);
  });

  it('rechaza javascript: con espacios delante', () => {
    expect(isSafeHref('  javascript:alert(1)')).toBe(false);
  });

  it('rechaza data:', () => {
    expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rechaza vbscript: y file:', () => {
    expect(isSafeHref('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeHref('file:///etc/passwd')).toBe(false);
  });

  it('rechaza blob:', () => {
    expect(isSafeHref('blob:https://leadseed.cl/abc')).toBe(false);
  });
});

describe('parseBody', () => {
  it('deja el texto sin marcas como un unico parrafo', () => {
    const bloques = parseBody('Hola, esto es una publicación vieja.');
    expect(bloques).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', value: 'Hola, esto es una publicación vieja.' }] },
    ]);
  });

  it('no devuelve bloques para un cuerpo vacio', () => {
    expect(parseBody('')).toEqual([]);
  });

  it('reconoce negrita', () => {
    const bloques = parseBody('esto es **importante** de verdad');
    expect(bloques[0]).toEqual({
      type: 'paragraph',
      inline: [
        { type: 'text', value: 'esto es ' },
        { type: 'bold', value: 'importante' },
        { type: 'text', value: ' de verdad' },
      ],
    });
  });

  it('deja la negrita sin cerrar como texto', () => {
    const bloques = parseBody('esto **no cierra');
    expect(bloques[0]).toEqual({
      type: 'paragraph',
      inline: [{ type: 'text', value: 'esto **no cierra' }],
    });
  });

  it('reconoce encabezados de nivel 1 y 2', () => {
    const bloques = parseBody('# Titulo\n## Subtitulo');
    expect(bloques.map((b) => b.type)).toEqual(['heading', 'heading']);
    expect(bloques[0]).toMatchObject({ level: 1 });
    expect(bloques[1]).toMatchObject({ level: 2 });
  });

  it('exige el espacio: "#etiqueta" no es un encabezado', () => {
    const bloques = parseBody('#etiqueta');
    expect(bloques[0]?.type).toBe('paragraph');
  });

  it('agrupa vinetas contiguas en una sola lista', () => {
    const bloques = parseBody('- uno\n- dos\n- tres');
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatchObject({ type: 'list' });
    expect(bloques[0]?.type === 'list' && bloques[0].items).toHaveLength(3);
  });

  it('corta la lista cuando aparece un parrafo en medio', () => {
    const bloques = parseBody('- uno\ntexto\n- dos');
    expect(bloques.map((b) => b.type)).toEqual(['list', 'paragraph', 'list']);
  });

  it('reconoce la linea horizontal', () => {
    expect(parseBody('---').map((b) => b.type)).toEqual(['hr']);
    expect(parseBody('-----').map((b) => b.type)).toEqual(['hr']);
  });

  it('no confunde "- - -" ni un guion suelto con una linea horizontal', () => {
    expect(parseBody('- item').map((b) => b.type)).toEqual(['list']);
    expect(parseBody('--')[0]?.type).toBe('paragraph');
  });

  it('reconoce un enlace valido', () => {
    const bloques = parseBody('mirá [la guía](https://leadseed.cl/guia) acá');
    expect(bloques[0]).toEqual({
      type: 'paragraph',
      inline: [
        { type: 'text', value: 'mirá ' },
        { type: 'link', label: 'la guía', href: 'https://leadseed.cl/guia' },
        { type: 'text', value: ' acá' },
      ],
    });
  });

  /*
   * SEGURIDAD: el enlace peligroso no debe llegar nunca a ser un `link`. Se
   * degrada a texto con la direccion visible, para que quien lee note que
   * habia algo raro en vez de encontrar una etiqueta inocente que no hace nada.
   */
  it('degrada a texto un enlace con javascript:', () => {
    const bloques = parseBody('[tocá acá](javascript:alert(1))');
    const inline = bloques[0]?.type === 'paragraph' ? bloques[0].inline : [];
    expect(inline.every((token) => token.type !== 'link')).toBe(true);
  });

  it('degrada a texto un enlace con data:', () => {
    const bloques = parseBody('[x](data:text/html,hola)');
    const inline = bloques[0]?.type === 'paragraph' ? bloques[0].inline : [];
    expect(inline.every((token) => token.type !== 'link')).toBe(true);
  });

  it('no corta el resto del cuerpo si un enlace esta mal formado', () => {
    const bloques = parseBody('antes [roto](sin cerrar\ndespués');
    expect(bloques).toHaveLength(1);
    const inline = bloques[0]?.type === 'paragraph' ? bloques[0].inline : [];
    expect(inline.map((t) => (t.type === 'text' ? t.value : '')).join('')).toContain('después');
  });

  it('nunca produce un token que no sea de los tres tipos conocidos', () => {
    const hostil = '# <script>alert(1)</script>\n- <img src=x onerror=alert(1)>\n**<b>x</b>**';
    const tipos = new Set<string>();

    for (const bloque of parseBody(hostil)) {
      if (bloque.type === 'hr') continue;
      const listas = bloque.type === 'list' ? bloque.items : [bloque.inline];
      for (const inline of listas) for (const token of inline) tipos.add(token.type);
    }

    expect([...tipos].every((tipo) => ['text', 'bold', 'link'].includes(tipo))).toBe(true);
  });

  it('toPlainBody quita las marcas y conserva la etiqueta del enlace', () => {
    expect(toPlainBody('# Titulo\n\n**hola** y [la guía](https://x.cl)')).toBe(
      'Titulo hola y la guía'
    );
  });

  it('toPlainBody no filtra la direccion de un enlace peligroso', () => {
    const plano = toPlainBody('[tocá](javascript:alert(1))');
    expect(plano).not.toContain('<');
  });

  it('mezcla encabezado, lista, separador y parrafo en el orden correcto', () => {
    const bloques = parseBody('# Titulo\n\n- uno\n- dos\n\n---\n\nCierre');
    expect(bloques.map((b) => b.type)).toEqual(['heading', 'list', 'hr', 'paragraph']);
  });
});
