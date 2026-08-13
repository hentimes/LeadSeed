import { useMemo, useState } from 'react';

export type SortField = 'createdAt' | 'name' | 'rut';
type SortDir = 'asc' | 'desc';

/** Lo unico que `useSort` asume del elemento mas alla de los extractores. */
interface Anclable {
  isPinned?: boolean;
}

export interface SortConfig {
  field: SortField;
  dir: SortDir;
}

export function useSort<T>(items: T[], extractors: Record<SortField, (item: T) => string | number>) {
  const [sort, setSort] = useState<SortConfig>({ field: 'createdAt', dir: 'desc' });

  const toggle = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sorted = useMemo(() => {
    const extract = extractors[sort.field];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      // Pinned leads always at the top
      // `useSort` es generico y no exige `isPinned`, pero los leads lo traen y
      // los anclados van siempre arriba. Se declara esa suposicion en un tipo
      // en vez de apagar el tipado con `any`.
      const isPinnedA = (a as T & Anclable).isPinned ? 1 : 0;
      const isPinnedB = (b as T & Anclable).isPinned ? 1 : 0;
      if (isPinnedA !== isPinnedB) {
        return isPinnedB - isPinnedA;
      }

      const va = extract(a);
      const vb = extract(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
    });
  }, [items, sort, extractors]);

  return { sort, toggle, sorted };
}
