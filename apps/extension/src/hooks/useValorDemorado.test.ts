import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useValorDemorado } from './useValorDemorado';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useValorDemorado', () => {
  it('devuelve el valor inicial sin esperar', () => {
    const { result } = renderHook(() => useValorDemorado('rodriguez', 300));

    expect(result.current).toBe('rodriguez');
  });

  it('no entrega el valor nuevo antes de que pase la demora', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDemorado(v, 300), {
      initialProps: { v: '' },
    });

    rerender({ v: 'rod' });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe('');
  });

  it('entrega el valor cuando la demora se cumple', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDemorado(v, 300), {
      initialProps: { v: '' },
    });

    rerender({ v: 'rod' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('rod');
  });

  it('escribir rapido produce un solo valor, el ultimo', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDemorado(v, 300), {
      initialProps: { v: '' },
    });

    // Nueve teclas a 50 ms: ninguna alcanza a cumplir la demora.
    for (const v of ['r', 'ro', 'rod', 'rodr', 'rodri', 'rodrig', 'rodrigu', 'rodrigue', 'rodriguez']) {
      rerender({ v });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe('');
    }

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('rodriguez');
  });

  it('borrar hasta volver al valor ya entregado no dispara otro cambio', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDemorado(v, 300), {
      initialProps: { v: 'rod' },
    });

    rerender({ v: 'rodr' });
    rerender({ v: 'rod' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('rod');
  });
});
