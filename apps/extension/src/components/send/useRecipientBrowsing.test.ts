import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRecipientBrowsing } from './useRecipientBrowsing';

const CLAVE = 'ls.destinatarios.ocultarSinNombre';

beforeEach(() => localStorage.clear());

describe('useRecipientBrowsing', () => {
  it('empieza en la primera pagina y sin filtro', () => {
    const { result } = renderHook(() => useRecipientBrowsing(1));

    expect(result.current.pagina).toBe(1);
    expect(result.current.ocultarSinNombre).toBe(false);
  });

  /*
   * El caso que motiva el cambio: misma plantilla, otro contacto. La hoja se
   * abre y se cierra en cada envio, y volvia siempre a la pagina 1.
   */
  it('mantiene la pagina mientras no se cambie de plantilla', () => {
    const { result, rerender } = renderHook(({ id }) => useRecipientBrowsing(id), {
      initialProps: { id: 1 },
    });

    act(() => result.current.setPagina(8));
    rerender({ id: 1 });

    expect(result.current.pagina).toBe(8);
  });

  it('vuelve a la primera pagina al cambiar de plantilla', () => {
    const { result, rerender } = renderHook(({ id }) => useRecipientBrowsing(id), {
      initialProps: { id: 1 },
    });

    act(() => result.current.setPagina(8));
    rerender({ id: 2 });

    expect(result.current.pagina).toBe(1);
  });

  it('recuerda el filtro de leads sin nombre entre sesiones', () => {
    const primera = renderHook(() => useRecipientBrowsing(1));
    act(() => primera.result.current.setOcultarSinNombre(true));
    expect(localStorage.getItem(CLAVE)).toBe('1');

    // Otra apertura de la hoja, con el estado ya perdido.
    const segunda = renderHook(() => useRecipientBrowsing(1));
    expect(segunda.result.current.ocultarSinNombre).toBe(true);
  });

  it('al apagar el filtro deja de recordarlo encendido', () => {
    localStorage.setItem(CLAVE, '1');
    const { result } = renderHook(() => useRecipientBrowsing(1));

    act(() => result.current.setOcultarSinNombre(false));

    expect(localStorage.getItem(CLAVE)).toBe('0');
    expect(renderHook(() => useRecipientBrowsing(1)).result.current.ocultarSinNombre).toBe(false);
  });

  it('sin plantilla elegida no se queda enganchado en una pagina vieja', () => {
    const { result, rerender } = renderHook(({ id }) => useRecipientBrowsing(id), {
      initialProps: { id: null as number | null },
    });

    act(() => result.current.setPagina(4));
    rerender({ id: 7 });

    expect(result.current.pagina).toBe(1);
  });
});
