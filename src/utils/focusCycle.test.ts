import { describe, expect, test } from 'vitest';
import { siguienteFoco } from './focusCycle';

/** Elementos de mentira: `siguienteFoco` solo compara identidades y posiciones. */
function botones(cuantos: number): HTMLElement[] {
  return Array.from({ length: cuantos }, () => document.createElement('button'));
}

describe('siguienteFoco', () => {
  test('en medio de la lista no interviene', () => {
    const [a, b, c] = botones(3) as [HTMLElement, HTMLElement, HTMLElement];

    expect(siguienteFoco([a, b, c], b, false)).toBeNull();
  });

  test('desde el ultimo, Tab vuelve al primero', () => {
    const [a, b, c] = botones(3) as [HTMLElement, HTMLElement, HTMLElement];

    expect(siguienteFoco([a, b, c], c, false)).toBe(a);
  });

  test('desde el primero, Shift+Tab salta al ultimo', () => {
    const [a, b, c] = botones(3) as [HTMLElement, HTMLElement, HTMLElement];

    expect(siguienteFoco([a, b, c], a, true)).toBe(c);
  });

  test('desde el primero, Tab normal no interviene', () => {
    const [a, b, c] = botones(3) as [HTMLElement, HTMLElement, HTMLElement];

    expect(siguienteFoco([a, b, c], a, false)).toBeNull();
  });

  test('con el foco fuera del dialogo lo trae al primero', () => {
    // Pasa cuando el usuario venia tabulando por la pagina de atras.
    const [a, b] = botones(2) as [HTMLElement, HTMLElement];
    const ajeno = document.createElement('input');

    expect(siguienteFoco([a, b], ajeno, false)).toBe(a);
  });

  test('con el foco fuera y Shift+Tab lo trae al ultimo', () => {
    const [a, b] = botones(2) as [HTMLElement, HTMLElement];
    const ajeno = document.createElement('input');

    expect(siguienteFoco([a, b], ajeno, true)).toBe(b);
  });

  test('con un solo control el foco se queda donde esta', () => {
    const [a] = botones(1) as [HTMLElement];

    expect(siguienteFoco([a], a, false)).toBe(a);
    expect(siguienteFoco([a], a, true)).toBe(a);
  });

  test('sin controles no hay nada que hacer', () => {
    // Un dialogo de solo texto. Sin esto, el ciclo intentaria leer el indice -1.
    expect(siguienteFoco([], null, false)).toBeNull();
  });

  test('sin foco previo entra por el primero', () => {
    const [a, b] = botones(2) as [HTMLElement, HTMLElement];

    expect(siguienteFoco([a, b], null, false)).toBe(a);
  });
});
