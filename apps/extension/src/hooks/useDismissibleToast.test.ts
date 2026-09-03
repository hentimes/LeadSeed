import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useDismissibleToast } from './useDismissibleToast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDismissibleToast', () => {
  test('arranca sin aviso', () => {
    const { result } = renderHook(() => useDismissibleToast<string>(6000));

    expect(result.current.toast).toBeNull();
  });

  test('muestra el aviso y lo apaga al vencer', () => {
    const { result } = renderHook(() => useDismissibleToast<string>(6000));

    act(() => result.current.show('borrado'));
    expect(result.current.toast).toBe('borrado');

    act(() => vi.advanceTimersByTime(5999));
    expect(result.current.toast).toBe('borrado');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toBeNull();
  });

  test('dismiss lo apaga antes de tiempo', () => {
    const { result } = renderHook(() => useDismissibleToast<string>(6000));

    act(() => result.current.show('borrado'));
    act(() => result.current.dismiss());

    expect(result.current.toast).toBeNull();
  });

  test('un segundo aviso reinicia la cuenta atras', () => {
    // Es la razon de ser del hook. Sin cancelar el temporizador anterior, el
    // del primer aviso apagaba el segundo antes de que se cumpliera su tiempo,
    // y en la bandeja de leads eso pasaba al anclar dos leads seguidos.
    const { result } = renderHook(() => useDismissibleToast<string>(6000));

    act(() => result.current.show('primero'));
    act(() => vi.advanceTimersByTime(5000));

    act(() => result.current.show('segundo'));
    act(() => vi.advanceTimersByTime(5000));

    // Han pasado 10s desde el primero, pero solo 5 desde el segundo.
    expect(result.current.toast).toBe('segundo');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toast).toBeNull();
  });

  test('tras apagarse con dismiss, el temporizador viejo no borra el siguiente', () => {
    const { result } = renderHook(() => useDismissibleToast<string>(6000));

    act(() => result.current.show('primero'));
    act(() => result.current.dismiss());
    act(() => result.current.show('segundo'));

    act(() => vi.advanceTimersByTime(5999));
    expect(result.current.toast).toBe('segundo');
  });

  test('al desmontar no queda ningun temporizador vivo', () => {
    // Salir de la bandeja con un aviso abierto dejaba un setTimeout intentando
    // escribir estado en un componente que ya no existe.
    const { result, unmount } = renderHook(() => useDismissibleToast<string>(6000));

    act(() => result.current.show('borrado'));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  test('respeta la duracion que se le pasa', () => {
    const { result } = renderHook(() => useDismissibleToast<string>(3000));

    act(() => result.current.show('anclado'));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.toast).toBeNull();
  });

  test('guarda el objeto completo, no solo un texto', () => {
    const { result } = renderHook(() => useDismissibleToast<{ id: string; name: string }>(6000));

    act(() => result.current.show({ id: 'l1', name: 'Ana' }));

    expect(result.current.toast).toEqual({ id: 'l1', name: 'Ana' });
  });
});
