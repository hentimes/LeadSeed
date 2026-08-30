import { describe, expect, it } from 'vitest';
import {
  insertBlockLine,
  insertLink,
  toggleLinePrefix,
  wrapSelection,
} from './textareaSelection';

describe('wrapSelection', () => {
  it('envuelve el texto seleccionado', () => {
    const r = wrapSelection('hola mundo', 5, 10, '**');
    expect(r.text).toBe('hola **mundo**');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('mundo');
  });

  it('sin seleccion inserta el par y deja el cursor en el medio', () => {
    const r = wrapSelection('hola ', 5, 5, '**');
    expect(r.text).toBe('hola ****');
    expect(r.selectionStart).toBe(7);
    expect(r.selectionStart).toBe(r.selectionEnd);
  });

  it('quita la marca si ya estaba puesta', () => {
    const texto = 'hola **mundo**';
    const r = wrapSelection(texto, 7, 12, '**');
    expect(r.text).toBe('hola mundo');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('mundo');
  });

  it('funciona al principio del texto', () => {
    const r = wrapSelection('mundo', 0, 5, '**');
    expect(r.text).toBe('**mundo**');
  });
});

describe('toggleLinePrefix', () => {
  it('agrega el prefijo a la linea del cursor', () => {
    const r = toggleLinePrefix('titulo', 3, '# ');
    expect(r.text).toBe('# titulo');
    expect(r.selectionStart).toBe(5);
  });

  it('lo quita si ya estaba', () => {
    const r = toggleLinePrefix('# titulo', 5, '# ');
    expect(r.text).toBe('titulo');
  });

  it('reemplaza un prefijo del mismo grupo en vez de apilarlo', () => {
    const r = toggleLinePrefix('# titulo', 5, '## ');
    expect(r.text).toBe('## titulo');
  });

  it('pasa de vineta a encabezado sin dejar restos', () => {
    const r = toggleLinePrefix('- item', 3, '# ');
    expect(r.text).toBe('# item');
  });

  it('solo toca la linea del cursor', () => {
    const r = toggleLinePrefix('uno\ndos\ntres', 5, '- ');
    expect(r.text).toBe('uno\n- dos\ntres');
  });

  it('no deja el cursor antes del inicio de la linea al quitar el prefijo', () => {
    const r = toggleLinePrefix('# a', 0, '# ');
    expect(r.selectionStart).toBeGreaterThanOrEqual(0);
  });
});

describe('insertBlockLine', () => {
  it('inserta la linea horizontal en su propio renglon', () => {
    const r = insertBlockLine('parrafo', 3, '---');
    expect(r.text).toBe('parrafo\n---\n');
  });

  it('no arranca con un salto si el texto estaba vacio', () => {
    const r = insertBlockLine('', 0, '---');
    expect(r.text).toBe('---\n');
  });

  it('inserta despues de la linea del cursor, no al final del texto', () => {
    const r = insertBlockLine('uno\ndos', 1, '---');
    expect(r.text).toBe('uno\n---\ndos');
  });
});

describe('insertLink', () => {
  it('usa el texto seleccionado como etiqueta', () => {
    const r = insertLink('mirá la guía', 5, 12, 'https://leadseed.cl');
    expect(r.text).toBe('mirá [la guía](https://leadseed.cl)');
  });

  it('sin seleccion usa la direccion como etiqueta', () => {
    const r = insertLink('', 0, 0, 'https://leadseed.cl');
    expect(r.text).toBe('[https://leadseed.cl](https://leadseed.cl)');
  });

  it('prefiere la etiqueta explicita sobre la seleccion', () => {
    const r = insertLink('hola', 0, 4, 'https://leadseed.cl', 'la guía');
    expect(r.text).toBe('[la guía](https://leadseed.cl)');
  });

  it('deja el cursor despues del enlace', () => {
    const r = insertLink('a', 1, 1, 'https://x.cl');
    expect(r.selectionStart).toBe(r.text.length);
  });
});
