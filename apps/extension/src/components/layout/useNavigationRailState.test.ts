import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNavigationRailState } from './useNavigationRailState';

const CLAVE = 'ls.rail.expanded';

describe('useNavigationRailState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca contraido cuando no hay preferencia guardada', () => {
    const { result } = renderHook(() => useNavigationRailState());
    expect(result.current.isExpanded).toBe(false);
  });

  /*
   * El estado se lee dentro del inicializador de `useState`, no en un efecto:
   * si se leyera despues, el primer fotograma se pintaria contraido y el rail
   * saltaria a su ancho expandido a la vista del usuario.
   */
  it('respeta la preferencia guardada ya en el primer render', () => {
    localStorage.setItem(CLAVE, '1');
    const { result } = renderHook(() => useNavigationRailState());
    expect(result.current.isExpanded).toBe(true);
  });

  it('guarda el estado al alternarlo', () => {
    const { result } = renderHook(() => useNavigationRailState());

    act(() => result.current.toggle());

    expect(result.current.isExpanded).toBe(true);
    expect(localStorage.getItem(CLAVE)).toBe('1');
  });

  it('contrae y deja de recordar el estado abierto', () => {
    localStorage.setItem(CLAVE, '1');
    const { result } = renderHook(() => useNavigationRailState());

    act(() => result.current.collapse());

    expect(result.current.isExpanded).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBe('0');
  });

  it('contraer un rail ya contraido no toca el almacenamiento', () => {
    const { result } = renderHook(() => useNavigationRailState());

    act(() => result.current.collapse());

    expect(result.current.isExpanded).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
