import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './useLongPress';

/** Un evento de puntero con lo justo que mira el hook. */
function puntero(x = 0, y = 0) {
  return { clientX: x, clientY: y } as React.PointerEvent;
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('dispara al mantener apretado el tiempo completo', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero()));
    expect(alMantener).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(450));
    expect(alMantener).toHaveBeenCalledTimes(1);
  });

  it('no dispara si se suelta antes', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero()));
    act(() => void vi.advanceTimersByTime(300));
    act(() => result.current.onPointerUp());
    act(() => void vi.advanceTimersByTime(500));

    expect(alMantener).not.toHaveBeenCalled();
  });

  it('no dispara si el puntero sale del elemento', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero()));
    act(() => result.current.onPointerLeave());
    act(() => void vi.advanceTimersByTime(500));

    expect(alMantener).not.toHaveBeenCalled();
  });

  /*
   * El caso que mas importa: sin esta cancelacion, recorrer la conversacion
   * con el dedo abre los controles de cualquier mensaje que se toque al pasar.
   */
  it('cancela si el dedo se movio mas de la tolerancia', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero(0, 0)));
    act(() => result.current.onPointerMove(puntero(0, 40)));
    act(() => void vi.advanceTimersByTime(500));

    expect(alMantener).not.toHaveBeenCalled();
  });

  it('tolera un temblor pequeño sin cancelar', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero(0, 0)));
    act(() => result.current.onPointerMove(puntero(2, 3)));
    act(() => void vi.advanceTimersByTime(450));

    expect(alMantener).toHaveBeenCalledTimes(1);
  });

  it('ignora el movimiento si no hay una pulsacion en curso', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerMove(puntero(50, 50)));
    act(() => void vi.advanceTimersByTime(500));

    expect(alMantener).not.toHaveBeenCalled();
  });

  it('no dispara despues de desmontarse', () => {
    const alMantener = vi.fn();
    const { result, unmount } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero()));
    unmount();
    act(() => void vi.advanceTimersByTime(500));

    expect(alMantener).not.toHaveBeenCalled();
  });

  it('una pulsacion nueva reinicia la cuenta', () => {
    const alMantener = vi.fn();
    const { result } = renderHook(() => useLongPress(alMantener, 450));

    act(() => result.current.onPointerDown(puntero()));
    act(() => void vi.advanceTimersByTime(400));
    act(() => result.current.onPointerDown(puntero()));
    act(() => void vi.advanceTimersByTime(100));

    expect(alMantener).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(350));
    expect(alMantener).toHaveBeenCalledTimes(1);
  });
});
