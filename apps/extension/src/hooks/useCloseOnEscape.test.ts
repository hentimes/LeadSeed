import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetCloseOnEscapeForTesting, useCloseOnEscape } from './useCloseOnEscape';

// La pila es estado de modulo: sin esto un test dejaria callbacks vivos para
// el siguiente.
afterEach(resetCloseOnEscapeForTesting);

function pulsar(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('useCloseOnEscape', () => {
  test('Escape cierra', () => {
    const onClose = vi.fn();
    renderHook(() => useCloseOnEscape(onClose));

    pulsar('Escape');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('otras teclas no cierran', () => {
    const onClose = vi.fn();
    renderHook(() => useCloseOnEscape(onClose));

    pulsar('Enter');
    pulsar('a');
    pulsar('Esc');

    expect(onClose).not.toHaveBeenCalled();
  });

  test('con enabled en false no escucha', () => {
    const onClose = vi.fn();
    renderHook(() => useCloseOnEscape(onClose, false));

    pulsar('Escape');

    expect(onClose).not.toHaveBeenCalled();
  });

  test('al desmontar deja de escuchar', () => {
    // Sin limpiar el listener, cada apertura de un menu dejaria uno vivo y un
    // Escape acabaria llamando a callbacks de menus ya cerrados.
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useCloseOnEscape(onClose));

    unmount();
    pulsar('Escape');

    expect(onClose).not.toHaveBeenCalled();
  });

  test('pasar de enabled true a false deja de escuchar', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ on }) => useCloseOnEscape(onClose, on), {
      initialProps: { on: true },
    });

    rerender({ on: false });
    pulsar('Escape');

    expect(onClose).not.toHaveBeenCalled();
  });

  test('un solo Escape cierra el menu de dentro, no el de fuera', () => {
    // Abrir un menu dentro de otro y que un Escape cierre los dos de golpe no
    // es lo que espera nadie. Gana el ultimo que se monto.
    const cerrarFuera = vi.fn();
    const cerrarDentro = vi.fn();

    renderHook(() => useCloseOnEscape(cerrarFuera));
    renderHook(() => useCloseOnEscape(cerrarDentro));

    pulsar('Escape');

    expect(cerrarDentro).toHaveBeenCalledTimes(1);
    expect(cerrarFuera).not.toHaveBeenCalled();
  });

  test('cerrado el de dentro, el siguiente Escape cierra el de fuera', () => {
    const cerrarFuera = vi.fn();
    const cerrarDentro = vi.fn();

    renderHook(() => useCloseOnEscape(cerrarFuera));
    const dentro = renderHook(() => useCloseOnEscape(cerrarDentro));

    pulsar('Escape');
    dentro.unmount();
    pulsar('Escape');

    expect(cerrarDentro).toHaveBeenCalledTimes(1);
    expect(cerrarFuera).toHaveBeenCalledTimes(1);
  });

  test('desmontar el de dentro no se lleva por delante al de fuera', () => {
    // La pila se limpia por identidad del callback, no por posicion.
    const cerrarFuera = vi.fn();
    const dentro = renderHook(() => useCloseOnEscape(vi.fn()));
    renderHook(() => useCloseOnEscape(cerrarFuera));

    dentro.unmount();
    pulsar('Escape');

    expect(cerrarFuera).toHaveBeenCalledTimes(1);
  });
});
