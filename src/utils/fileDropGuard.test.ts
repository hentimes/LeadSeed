import { describe, it, expect } from 'vitest';
import { debeBloquearSoltar } from './fileDropGuard';

describe('debeBloquearSoltar', () => {
  it('bloquea un archivo soltado sobre un textarea', () => {
    expect(debeBloquearSoltar(true, { etiqueta: 'textarea' })).toBe(true);
  });

  it('bloquea un archivo soltado sobre un input', () => {
    expect(debeBloquearSoltar(true, { etiqueta: 'INPUT' })).toBe(true);
  });

  it('bloquea sobre un elemento contenteditable', () => {
    expect(debeBloquearSoltar(true, { etiqueta: 'div', editable: true })).toBe(true);
  });

  it('deja pasar el arrastre interno, que no trae archivos', () => {
    // Reordenar columnas o mover un lead usa `text/plain`, no archivos.
    expect(debeBloquearSoltar(false, { etiqueta: 'textarea' })).toBe(false);
  });

  it('deja pasar los archivos en una zona que los espera', () => {
    // `ImportModal` recibe el Excel arrastrado; bloquearlo romperia la importacion.
    expect(
      debeBloquearSoltar(true, { etiqueta: 'div', dentroDeZonaDeArchivos: true })
    ).toBe(false);
  });

  it('la zona de archivos manda incluso sobre un campo de texto', () => {
    expect(
      debeBloquearSoltar(true, { etiqueta: 'input', dentroDeZonaDeArchivos: true })
    ).toBe(false);
  });

  it('no bloquea sobre elementos que no escriben texto', () => {
    expect(debeBloquearSoltar(true, { etiqueta: 'div' })).toBe(false);
    expect(debeBloquearSoltar(true, { etiqueta: 'button' })).toBe(false);
  });
});
