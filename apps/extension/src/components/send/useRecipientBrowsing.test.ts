import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../../services/appSettingsService', () => ({
  getSettings: vi.fn().mockRejectedValue(new Error('sin red en los tests')),
  saveSettings: vi.fn(),
}));

import { useRecipientBrowsing } from './useRecipientBrowsing';
import { reiniciarOcultarSinNombreParaTests } from '../../hooks/useHideUnnamedLeads';

/*
 * El filtro de leads sin nombre ya no vive aqui: es el ajuste de cuenta
 * compartido de `useHideUnnamedLeads`, con un cache en `localStorage` para que
 * el primer fotograma no parpadee. Los tests de abajo comprueban que la hoja
 * lo recuerda, sin atarse a como se guarda.
 */
const CLAVE = 'ls.leads.ocultarSinNombre';

beforeEach(() => {
  localStorage.clear();
  reiniciarOcultarSinNombreParaTests();
});

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

    // Otra apertura de la hoja, con el estado de este componente ya perdido.
    const segunda = renderHook(() => useRecipientBrowsing(1));
    expect(segunda.result.current.ocultarSinNombre).toBe(true);
  });

  it('al apagar el filtro deja de recordarlo encendido', () => {
    const { result } = renderHook(() => useRecipientBrowsing(1));
    act(() => result.current.setOcultarSinNombre(true));

    act(() => result.current.setOcultarSinNombre(false));

    expect(renderHook(() => useRecipientBrowsing(1)).result.current.ocultarSinNombre).toBe(false);
  });

  /*
   * Lo que motivo unificarlo: la hoja tenia su propia clave, asi que apagarlo
   * en Leads lo dejaba encendido aqui. Ahora el cache es el mismo, y una hoja
   * recien abierta arranca con lo que dejo la otra pantalla.
   */
  it('arranca con el valor que dejo el resto de la aplicacion', () => {
    localStorage.setItem(CLAVE, '1');
    reiniciarOcultarSinNombreParaTests();

    // El almacen de modulo se relee al reiniciar; se simula otra apertura.
    const { result } = renderHook(() => useRecipientBrowsing(1));
    act(() => result.current.setOcultarSinNombre(true));

    expect(renderHook(() => useRecipientBrowsing(1)).result.current.ocultarSinNombre).toBe(true);
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
