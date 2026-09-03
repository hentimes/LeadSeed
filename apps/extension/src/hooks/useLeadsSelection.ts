import { useCallback, useState } from 'react';
import type { Lead } from '../types';

/**
 * Seleccion multiple de la bandeja de leads.
 *
 * Extraido de `useLeadsPageController`, que devolvia un objeto de 70
 * propiedades y mezclaba paginacion, filtros, seleccion, papelera, exportacion,
 * importacion, anclados y avisos.
 *
 * Se saca completo, con `lastClickedIndex` incluido, porque ese indice solo
 * existe para que la seleccion por rango sepa desde donde arrastrar: separarlo
 * de aqui obligaria al llamador a mantener sincronizados dos estados que en
 * realidad son uno.
 *
 * El hook expone acciones con nombre en vez del `setSelectedIds` crudo. La
 * diferencia importa: antes cualquier consumidor podia dejar la seleccion en un
 * estado arbitrario, y de hecho el controller la limpiaba desde seis sitios
 * distintos con `setSelectedIds(new Set())` repetido.
 */
export interface LeadsSelection {
  selectedIds: Set<string>;
  /** Ultima fila pulsada, ancla de la seleccion por rango con mayusculas. */
  lastClickedIndex: number | null;
  setLastClickedIndex(index: number | null): void;
  toggle(id: string): void;
  /** Selecciona todo, o vacia la seleccion si ya estaba todo marcado. */
  toggleAll(): void;
  /** Marca o desmarca un rango contiguo, en cualquier direccion. */
  selectRange(from: number, to: number, select: boolean): void;
  /** Quita un id concreto, por ejemplo al eliminar ese lead. */
  remove(id: string): void;
  clear(): void;
}

export function useLeadsSelection(leads: Lead[]): LeadsSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      // Si ya estaba todo marcado, el mismo gesto desmarca.
      if (prev.size === leads.length) return new Set();
      return new Set(leads.map((lead) => lead.id!));
    });
  }, [leads]);

  const selectRange = useCallback(
    (from: number, to: number, select: boolean) => {
      // Se normaliza el orden para que arrastrar hacia arriba funcione igual
      // que hacia abajo.
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const idsInRange = leads.slice(start, end + 1).map((lead) => lead.id!);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of idsInRange) {
          if (select) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [leads],
  );

  const remove = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    lastClickedIndex,
    setLastClickedIndex,
    toggle,
    toggleAll,
    selectRange,
    remove,
    clear,
  };
}
