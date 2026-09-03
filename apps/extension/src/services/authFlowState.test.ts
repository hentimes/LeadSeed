import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const set = vi.fn();

vi.mock('../platform/registry', () => ({
  getPlatform: () => ({ storage: { local: { get, set } } }),
}));

import { clearPendingAuthFlow, loadPendingAuthFlow, savePendingAuthFlow } from './authFlowState';

const UNA_HORA = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  set.mockResolvedValue(undefined);
});

describe('savePendingAuthFlow', () => {
  it('guarda solo el proposito, el correo y el momento', async () => {
    const flujo = { purpose: 'signup' as const, email: 'ana@ejemplo.com', startedAt: 1000 };

    await savePendingAuthFlow(flujo);

    expect(set).toHaveBeenCalledWith({ pendingAuthFlow: flujo });
  });

  it('nunca persiste contrasena ni codigo', async () => {
    await savePendingAuthFlow({
      purpose: 'recovery',
      email: 'ana@ejemplo.com',
      startedAt: Date.now(),
    });

    // Se serializa todo lo que llego al almacenamiento, no solo el primer
    // argumento: si alguna vez se colara un segundo `set` con datos de mas, este
    // test tiene que verlo igual.
    const guardado = JSON.stringify(set.mock.calls);
    expect(guardado).not.toMatch(/password|contrasena|code|codigo/i);
  });
});

describe('loadPendingAuthFlow', () => {
  it('devuelve el flujo guardado si es reciente', async () => {
    const flujo = { purpose: 'signup', email: 'ana@ejemplo.com', startedAt: Date.now() };
    get.mockResolvedValue({ pendingAuthFlow: flujo });

    await expect(loadPendingAuthFlow()).resolves.toEqual(flujo);
  });

  it('devuelve null cuando no hay nada guardado', async () => {
    get.mockResolvedValue({});

    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });

  it('descarta y borra un flujo caducado', async () => {
    get.mockResolvedValue({
      pendingAuthFlow: {
        purpose: 'signup',
        email: 'ana@ejemplo.com',
        startedAt: Date.now() - UNA_HORA - 1000,
      },
    });

    await expect(loadPendingAuthFlow()).resolves.toBeNull();
    expect(set).toHaveBeenCalledWith({ pendingAuthFlow: null });
  });

  // El almacenamiento es un sitio que otro codigo puede tocar, y en web plano ni
  // siquiera existe. Todo lo que no tenga la forma exacta se descarta.
  it('descarta un proposito desconocido', async () => {
    get.mockResolvedValue({
      pendingAuthFlow: { purpose: 'reset', email: 'ana@ejemplo.com', startedAt: Date.now() },
    });

    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });

  it('descarta un correo vacio o que no es texto', async () => {
    get.mockResolvedValue({
      pendingAuthFlow: { purpose: 'signup', email: '', startedAt: Date.now() },
    });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();

    get.mockResolvedValue({
      pendingAuthFlow: { purpose: 'signup', email: 42, startedAt: Date.now() },
    });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });

  it('descarta un startedAt que no es un numero finito', async () => {
    get.mockResolvedValue({
      pendingAuthFlow: { purpose: 'signup', email: 'ana@ejemplo.com', startedAt: Number.NaN },
    });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();

    get.mockResolvedValue({
      pendingAuthFlow: { purpose: 'signup', email: 'ana@ejemplo.com', startedAt: 'ayer' },
    });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });

  it('descarta valores que no son objetos', async () => {
    get.mockResolvedValue({ pendingAuthFlow: 'signup' });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();

    get.mockResolvedValue({ pendingAuthFlow: null });
    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });

  // Quedarse fuera de la aplicacion porque el almacenamiento no responde seria
  // mucho peor que empezar de cero.
  it('no lanza si el almacenamiento falla', async () => {
    get.mockRejectedValue(new Error('storage caido'));

    await expect(loadPendingAuthFlow()).resolves.toBeNull();
  });
});

describe('clearPendingAuthFlow', () => {
  it('borra la marca', async () => {
    await clearPendingAuthFlow();

    expect(set).toHaveBeenCalledWith({ pendingAuthFlow: null });
  });

  it('no lanza si el almacenamiento falla', async () => {
    set.mockRejectedValue(new Error('storage caido'));

    await expect(clearPendingAuthFlow()).resolves.toBeUndefined();
  });
});
