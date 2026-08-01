import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '../components/ColumnSelector';
import { LEAD_COLUMN_BY_KEY } from '../config/leadColumns';

/** Ancho real del cromo de la tabla: checkbox (32) + acciones (92). */
const CHROME_WIDTH = 124;

/**
 * Oculta columnas de forma progresiva segun el ancho disponible.
 *
 * La prioridad es el propio orden de las columnas: al angostarse el panel
 * se descartan primero las de la derecha. Asi reordenar no es solo
 * estetico, define que sobrevive.
 *
 * Nunca deja una columna cortada a la mitad: o entra completa o no entra.
 */
export function useResponsiveColumns(columns: ColumnDef[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  /** Desplazamiento del "ventaneo" de columnas al usar las flechas. */
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // ResizeObserver y no window.resize: el side panel cambia de ancho sin
    // que la ventana cambie de tamano.
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setAvailableWidth(width);
    });

    observer.observe(node);
    setAvailableWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const selectedColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);

  const fixedColumns = useMemo(
    () => selectedColumns.filter((column) => LEAD_COLUMN_BY_KEY.get(column.key)?.fixed),
    [selectedColumns],
  );

  /** Columnas que rotan con las flechas; las fijas quedan siempre ancladas. */
  const scrollableColumns = useMemo(
    () => selectedColumns.filter((column) => !LEAD_COLUMN_BY_KEY.get(column.key)?.fixed),
    [selectedColumns],
  );

  const renderedColumns = useMemo(() => {
    if (availableWidth <= 0) return selectedColumns;

    const widthOf = (column: ColumnDef) => LEAD_COLUMN_BY_KEY.get(column.key)?.width ?? 110;

    let budget = availableWidth - CHROME_WIDTH;
    for (const column of fixedColumns) budget -= widthOf(column);

    const windowed: ColumnDef[] = [];
    for (const column of scrollableColumns.slice(offset)) {
      const width = widthOf(column);
      if (budget < width) break;
      windowed.push(column);
      budget -= width;
    }

    return [...fixedColumns, ...windowed];
  }, [availableWidth, fixedColumns, offset, scrollableColumns, selectedColumns]);

  const shownScrollable = renderedColumns.length - fixedColumns.length;
  const hiddenCount = scrollableColumns.length - shownScrollable;

  // Si se agranda el panel o se ocultan columnas, el offset puede quedar
  // apuntando mas alla del final; se corrige para no dejar la tabla vacia.
  const maxOffset = Math.max(0, scrollableColumns.length - shownScrollable);
  useEffect(() => {
    setOffset((current) => Math.min(current, maxOffset));
  }, [maxOffset]);

  return {
    containerRef,
    renderedColumns,
    hiddenCount,
    canScrollBack: offset > 0,
    canScrollForward: offset < maxOffset,
    scrollBack: () => setOffset((current) => Math.max(0, current - 1)),
    scrollForward: () => setOffset((current) => Math.min(maxOffset, current + 1)),
  };
}
