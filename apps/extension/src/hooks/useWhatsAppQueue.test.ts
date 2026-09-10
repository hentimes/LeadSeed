import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWhatsAppQueue } from './useWhatsAppQueue';
import type { LeadMessage } from '../utils/waHelper';
import type { Lead } from '../types';

const abrir = vi.hoisted(() => vi.fn());

vi.mock('../utils/waHelper', async (original) => ({
  ...(await original<typeof import('../utils/waHelper')>()),
  openWhatsApp: abrir,
}));

function mensaje(nombre: string, phone: string): LeadMessage {
  return { lead: { id: nombre, name: nombre, phone } as Lead, message: `Hola ${nombre}` };
}

/** La plantilla de la ronda. Viaja con la cola, no con cada mensaje. */
const TANDA = { templateId: 'plantilla-1', templateName: 'WS Cold #1' };

const tres = [
  mensaje('Ana', '+56911111111'),
  mensaje('Beto', '+56922222222'),
  mensaje('Carla', '+56933333333'),
];

beforeEach(() => {
  vi.clearAllMocks();
  abrir.mockResolvedValue(undefined);
});

describe('useWhatsAppQueue', () => {
  it('empieza cerrada', () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    expect(result.current.activa).toBe(false);
    expect(result.current.actual).toBeUndefined();
  });

  /*
   * El fallo que motiva la cola: se abrian los tres de golpe y, como el proceso
   * de fondo reutiliza la misma pestana, solo sobrevivia uno.
   */
  it('al iniciar abre solo el primero', async () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar(tres, TANDA);
    });

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith('+56911111111', 'Hola Ana');
    expect(result.current.actual?.lead.name).toBe('Ana');
    expect(result.current.total).toBe(3);
  });

  it('avanza de a uno y anuncia quien sigue', async () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar(tres, TANDA);
    });
    expect(result.current.siguiente?.lead.name).toBe('Beto');

    await act(async () => {
      await result.current.avanzar();
    });

    expect(abrir).toHaveBeenCalledTimes(2);
    expect(abrir).toHaveBeenLastCalledWith('+56922222222', 'Hola Beto');
    expect(result.current.indice).toBe(1);
    expect(result.current.siguiente?.lead.name).toBe('Carla');
  });

  it('avanzar en el ultimo cierra la cola sin abrir nada mas', async () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar([tres[0]!], TANDA);
    });
    await act(async () => {
      await result.current.avanzar();
    });

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(result.current.activa).toBe(false);
  });

  /*
   * El historial daba por enviados a los N antes de abrir ninguno. Ahora se
   * registra cada uno al abrirse, y solo ese.
   */
  it('avisa de cada apertura por separado', async () => {
    const abierto = vi.fn();
    const { result } = renderHook(() => useWhatsAppQueue({ onAbierto: abierto }));

    await act(async () => {
      await result.current.iniciar(tres, TANDA);
    });
    expect(abierto).toHaveBeenCalledTimes(1);
    expect(abierto).toHaveBeenCalledWith(tres[0], TANDA);

    await act(async () => {
      await result.current.avanzar();
    });
    expect(abierto).toHaveBeenCalledTimes(2);
    expect(abierto).toHaveBeenLastCalledWith(tres[1], TANDA);
  });

  it('cancelar el resto no abre a los que faltaban', async () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar(tres, TANDA);
    });
    act(() => result.current.terminar());

    expect(result.current.activa).toBe(false);
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('si el chat no abre lo dice y deja reintentar al mismo lead', async () => {
    abrir.mockRejectedValueOnce(new Error('sin pestaña'));
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar(tres, TANDA);
    });
    expect(result.current.error).toBe('sin pestaña');

    await act(async () => {
      await result.current.reintentar();
    });

    expect(abrir).toHaveBeenLastCalledWith('+56911111111', 'Hola Ana');
    expect(result.current.error).toBe('');
    expect(result.current.indice).toBe(0);
  });

  it('una lista vacia no abre nada', async () => {
    const { result } = renderHook(() => useWhatsAppQueue());

    await act(async () => {
      await result.current.iniciar([], TANDA);
    });

    expect(abrir).not.toHaveBeenCalled();
    expect(result.current.activa).toBe(false);
  });

  /*
   * Lo que permitio borrar la segunda cola.
   *
   * La ronda de flujos tenia la suya porque "un destinatario es solo un lead y
   * no hay donde colgar el paso". Ahora el paso viaja dentro del mensaje y
   * llega intacto a quien registra: esa es toda la diferencia entre las dos
   * rondas, y por eso alcanza con una.
   */
  it('el paso de flujo viaja con el mensaje hasta quien registra', async () => {
    const abierto = vi.fn();
    const { result } = renderHook(() => useWhatsAppQueue({ onAbierto: abierto }));
    const conPaso: LeadMessage = {
      ...mensaje('Ana', '+56911111111'),
      pasoDeFlujo: { progressId: 42, enrollmentId: 7 },
    };

    await act(async () => {
      await result.current.iniciar([conPaso], TANDA);
    });

    expect(abierto).toHaveBeenCalledWith(conPaso, TANDA);
    expect(abierto.mock.calls[0]?.[0].pasoDeFlujo).toEqual({ progressId: 42, enrollmentId: 7 });
  });

  it('un mensaje del compositor llega sin paso', async () => {
    const abierto = vi.fn();
    const { result } = renderHook(() => useWhatsAppQueue({ onAbierto: abierto }));

    await act(async () => {
      await result.current.iniciar([tres[0]!], TANDA);
    });

    expect(abierto.mock.calls[0]?.[0].pasoDeFlujo).toBeUndefined();
  });
});
