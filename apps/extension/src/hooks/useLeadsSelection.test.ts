import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useLeadsSelection } from './useLeadsSelection';
import type { Lead } from '../types';

function leads(cuantos: number): Lead[] {
  return Array.from({ length: cuantos }, (_, i) => ({ id: `l${i}`, name: `Lead ${i}` }) as Lead);
}

describe('useLeadsSelection', () => {
  test('arranca vacia', () => {
    const { result } = renderHook(() => useLeadsSelection(leads(3)));

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.lastClickedIndex).toBeNull();
  });

  describe('toggle', () => {
    test('marca y desmarca el mismo id', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggle('l1'));
      expect([...result.current.selectedIds]).toEqual(['l1']);

      act(() => result.current.toggle('l1'));
      expect(result.current.selectedIds.size).toBe(0);
    });

    test('acumula varios sin pisarse', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggle('l0'));
      act(() => result.current.toggle('l2'));

      expect([...result.current.selectedIds].sort()).toEqual(['l0', 'l2']);
    });
  });

  describe('toggleAll', () => {
    test('marca todo cuando no habia nada', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggleAll());

      expect(result.current.selectedIds.size).toBe(3);
    });

    test('vacia cuando ya estaba todo marcado', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggleAll());
      act(() => result.current.toggleAll());

      expect(result.current.selectedIds.size).toBe(0);
    });

    test('completa la seleccion cuando habia algo marcado, no la vacia', () => {
      // Con seleccion parcial el gesto debe completar, que es lo que espera el
      // usuario al pulsar la casilla de la cabecera.
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggle('l1'));
      act(() => result.current.toggleAll());

      expect(result.current.selectedIds.size).toBe(3);
    });
  });

  describe('selectRange', () => {
    test('marca un rango contiguo, extremos incluidos', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(5)));

      act(() => result.current.selectRange(1, 3, true));

      expect([...result.current.selectedIds].sort()).toEqual(['l1', 'l2', 'l3']);
    });

    test('funciona igual arrastrando hacia arriba', () => {
      // from > to: el hook normaliza el orden.
      const { result } = renderHook(() => useLeadsSelection(leads(5)));

      act(() => result.current.selectRange(3, 1, true));

      expect([...result.current.selectedIds].sort()).toEqual(['l1', 'l2', 'l3']);
    });

    test('desmarca un rango sin tocar lo de fuera', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(5)));

      act(() => result.current.toggleAll());
      act(() => result.current.selectRange(1, 2, false));

      expect([...result.current.selectedIds].sort()).toEqual(['l0', 'l3', 'l4']);
    });

    test('un rango de un solo elemento afecta solo a ese', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(5)));

      act(() => result.current.selectRange(2, 2, true));

      expect([...result.current.selectedIds]).toEqual(['l2']);
    });

    test('conserva lo ya marcado fuera del rango', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(5)));

      act(() => result.current.toggle('l4'));
      act(() => result.current.selectRange(0, 1, true));

      expect([...result.current.selectedIds].sort()).toEqual(['l0', 'l1', 'l4']);
    });
  });

  describe('remove y clear', () => {
    test('remove quita solo el id indicado', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggleAll());
      act(() => result.current.remove('l1'));

      expect([...result.current.selectedIds].sort()).toEqual(['l0', 'l2']);
    });

    test('remove de un id no seleccionado no altera nada', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggle('l0'));
      act(() => result.current.remove('l2'));

      expect([...result.current.selectedIds]).toEqual(['l0']);
    });

    test('clear vacia', () => {
      const { result } = renderHook(() => useLeadsSelection(leads(3)));

      act(() => result.current.toggleAll());
      act(() => result.current.clear());

      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  test('el ancla de la seleccion por rango se guarda y se puede limpiar', () => {
    const { result } = renderHook(() => useLeadsSelection(leads(3)));

    act(() => result.current.setLastClickedIndex(2));
    expect(result.current.lastClickedIndex).toBe(2);

    act(() => result.current.setLastClickedIndex(null));
    expect(result.current.lastClickedIndex).toBeNull();
  });

  test('no muta el Set anterior: cada cambio produce uno nuevo', () => {
    // React compara por identidad; mutar en sitio no dispararia el re-render.
    const { result } = renderHook(() => useLeadsSelection(leads(3)));

    const antes = result.current.selectedIds;
    act(() => result.current.toggle('l0'));

    expect(result.current.selectedIds).not.toBe(antes);
    expect(antes.size).toBe(0);
  });
});
