import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '../components/ColumnSelector';
import { LEAD_COLUMN_BY_KEY } from '../config/leadColumns';

/** Ancho que ocupan checkbox de seleccion y acciones de la fila. */
const CHROME_WIDTH = 96;

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

  const renderedColumns = useMemo(() => {
    if (availableWidth <= 0) return selectedColumns;

    let budget = availableWidth - CHROME_WIDTH;
    const fitting: ColumnDef[] = [];

    for (const column of selectedColumns) {
      const definition = LEAD_COLUMN_BY_KEY.get(column.key);
      const width = definition?.width ?? 110;

      // La columna identidad siempre se muestra, aunque no quede espacio.
      if (definition?.fixed) {
        fitting.push(column);
        budget -= width;
        continue;
      }

      if (budget >= width) {
        fitting.push(column);
        budget -= width;
      }
    }

    return fitting;
  }, [availableWidth, selectedColumns]);

  const hiddenByWidth = selectedColumns.length - renderedColumns.length;

  return { containerRef, renderedColumns, hiddenByWidth };
}
