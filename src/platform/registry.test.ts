import { afterEach, describe, expect, test, vi } from 'vitest';
import { getPlatform, resetPlatformForTesting, setPlatform } from './registry';
import type { Platform } from './types';

function plataformaFalsa(): Platform {
  return {
    dialogs: { confirm: vi.fn(async () => true), alert: vi.fn(async () => {}) },
    navigation: { current: vi.fn(() => null), replace: vi.fn(), subscribe: vi.fn(() => () => {}) },
    storage: {
      sync: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) },
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) },
    },
    deeplink: { openExternal: vi.fn() },
    messageBus: { isAvailable: vi.fn(() => false), send: vi.fn(async () => {}), subscribe: vi.fn(() => () => {}) },
    oauth: { redirectUrl: vi.fn(() => ''), canCompleteInApp: vi.fn(() => false), launch: vi.fn(async () => null) },
  };
}

afterEach(() => {
  resetPlatformForTesting(null);
});

describe('registro de plataforma', () => {
  test('devuelve la plataforma que se registro', () => {
    const falsa = plataformaFalsa();
    setPlatform(falsa);

    expect(getPlatform()).toBe(falsa);
  });

  test('lanza un error claro si nadie la registro', () => {
    // Deliberado: un fallback silencioso a la implementacion web volveria a
    // meter chrome.* en el grafo de modulos, que es justo lo que el registro
    // existe para impedir. Mejor fallar en el arranque.
    expect(() => getPlatform()).toThrowError(/no registrada/i);
  });

  test('el ultimo registro gana', () => {
    const primera = plataformaFalsa();
    const segunda = plataformaFalsa();

    setPlatform(primera);
    setPlatform(segunda);

    expect(getPlatform()).toBe(segunda);
  });

  test('expone los seis puertos del contrato', () => {
    setPlatform(plataformaFalsa());
    const p = getPlatform();

    expect(Object.keys(p).sort()).toEqual([
      'deeplink', 'dialogs', 'messageBus', 'navigation', 'oauth', 'storage',
    ]);
  });

  test('una plataforma falsa permite sustituir el comportamiento sin tocar dominio', () => {
    // Este es el criterio de exito del bloque 5: la capa de dominio debe poder
    // correr contra una implementacion distinta sin modificar un solo archivo.
    const falsa = plataformaFalsa();
    falsa.dialogs.confirm = vi.fn(async () => false);
    setPlatform(falsa);

    expect(getPlatform().dialogs.confirm).toBe(falsa.dialogs.confirm);
  });
});
