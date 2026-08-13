import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { AT_BOTTOM_THRESHOLD_PX, useChatScroll } from './useChatScroll';

/** `happy-dom` no calcula layout: las medidas se fijan a mano. */
function situarScroll(
  ref: React.RefObject<HTMLDivElement>,
  medidas: { scrollTop: number; scrollHeight: number; clientHeight: number },
) {
  (ref as { current: HTMLDivElement }).current = medidas as unknown as HTMLDivElement;
}

let scrollIntoView: Mock<(arg?: boolean | ScrollIntoViewOptions) => void>;

beforeEach(() => {
  scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe('useChatScroll', () => {
  test('arranca abajo y sin mensajes por leer', () => {
    const { result } = renderHook(() => useChatScroll(0));

    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  describe('deteccion de "esta abajo"', () => {
    test('dentro del umbral cuenta como abajo', () => {
      const { result } = renderHook(() => useChatScroll(0));

      // Faltan 10px para el final: por debajo del umbral de 50.
      situarScroll(result.current.containerRef, {
        scrollTop: 990, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());

      expect(result.current.isAtBottom).toBe(true);
    });

    test('mas lejos que el umbral cuenta como arriba', () => {
      const { result } = renderHook(() => useChatScroll(0));

      situarScroll(result.current.containerRef, {
        scrollTop: 500, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());

      expect(result.current.isAtBottom).toBe(false);
    });

    test('el umbral no es cero, para que el scroll suave no haga parpadear', () => {
      // Justo en el limite: 49px de diferencia sigue siendo "abajo".
      const { result } = renderHook(() => useChatScroll(0));

      situarScroll(result.current.containerRef, {
        scrollTop: 1000 - (AT_BOTTOM_THRESHOLD_PX - 1), scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());

      expect(result.current.isAtBottom).toBe(true);
    });

    test('sin contenedor montado no revienta', () => {
      const { result } = renderHook(() => useChatScroll(0));

      expect(() => act(() => result.current.handleScroll())).not.toThrow();
    });
  });

  describe('contador de no leidos', () => {
    test('no cuenta mensajes si el usuario esta mirando el final', () => {
      const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
        initialProps: { n: 0 },
      });

      rerender({ n: 1 });
      rerender({ n: 2 });

      expect(result.current.unreadCount).toBe(0);
    });

    test('cuenta los mensajes que llegan mientras se lee mas arriba', () => {
      const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
        initialProps: { n: 0 },
      });

      situarScroll(result.current.containerRef, {
        scrollTop: 0, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());

      rerender({ n: 1 });
      rerender({ n: 2 });

      expect(result.current.unreadCount).toBe(2);
    });

    test('volver abajo por scroll pone el contador a cero', () => {
      const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
        initialProps: { n: 0 },
      });

      situarScroll(result.current.containerRef, {
        scrollTop: 0, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());
      rerender({ n: 1 });
      expect(result.current.unreadCount).toBe(1);

      situarScroll(result.current.containerRef, {
        scrollTop: 1000, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());

      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isAtBottom).toBe(true);
    });
  });

  describe('scrollToBottom', () => {
    test('baja, marca abajo y limpia el contador', () => {
      const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
        initialProps: { n: 0 },
      });

      situarScroll(result.current.containerRef, {
        scrollTop: 0, scrollHeight: 1500, clientHeight: 500,
      });
      act(() => result.current.handleScroll());
      rerender({ n: 1 });

      act(() => result.current.scrollToBottom());

      expect(result.current.isAtBottom).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  test('estando abajo, un mensaje nuevo desplaza la vista', () => {
    const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
      initialProps: { n: 0 },
    });

    // El ancla del final tiene que existir: sin nodo montado, el
    // `endRef.current?.scrollIntoView()` seria una operacion nula y el test
    // pasaria sin comprobar nada.
    (result.current.endRef as { current: HTMLDivElement }).current = document.createElement('div');
    scrollIntoView.mockClear();

    rerender({ n: 1 });

    expect(scrollIntoView).toHaveBeenCalled();
  });

  test('leyendo mas arriba, un mensaje nuevo NO mueve la vista', () => {
    // Es la razon de ser del hook: no arrastrar al usuario mientras lee.
    const { result, rerender } = renderHook(({ n }) => useChatScroll(n), {
      initialProps: { n: 0 },
    });

    situarScroll(result.current.containerRef, {
      scrollTop: 0, scrollHeight: 1500, clientHeight: 500,
    });
    act(() => result.current.handleScroll());
    (result.current.endRef as { current: HTMLDivElement }).current = document.createElement('div');
    scrollIntoView.mockClear();

    rerender({ n: 1 });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
