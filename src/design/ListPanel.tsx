import type { ReactNode } from 'react';

/**
 * La caja de una lista, y el aspecto de sus filas.
 *
 * `LeadIdentity` unifico como se escribe el nombre y el telefono de un lead.
 * Esto unifica lo otro: el borde, la cabecera, el alto de fila, el separador y
 * el hover. Sin esta pieza el resultado era que las cinco listas decian lo
 * mismo con la misma letra dentro de cinco cajas distintas, que es la mitad del
 * problema resuelta y la otra mitad intacta.
 *
 * Lo que habia el 2026-08-20, ya con la identidad unificada:
 *
 *   Gestion de Leads     px-2.5 py-1.5   border-line
 *   Envio Masivo         px-2   py-1.5   border-line
 *   Inscribir en Flujo   px-2.5 py-2     border-line-soft
 *   Listas               px-3   py-2     divide-line
 *   Pipeline             px-3   py-2     border-line
 *
 * Cuatro rellenos y tres separadores para la misma cosa.
 *
 * ## Por que las clases de fila se exportan como funcion
 *
 * Dos de las cinco listas son tablas de verdad, y un `<tr>` solo admite `<td>`
 * como hijo directo: un componente `ListRow` que devuelva un `<div>` no les
 * sirve. En vez de duplicar los valores para ellas -que es como se llego a
 * cuatro rellenos-, la fila de tabla pide sus clases a `clasesDeFila` y las
 * pone en su propio `<tr>`. Los valores siguen viviendo en un solo sitio.
 */

export type ListDensity = 'compact' | 'normal';

const RELLENO: Record<ListDensity, string> = {
  compact: 'px-3 py-1.5',
  normal: 'px-3 py-2',
};

/**
 * Tono de fondo de una fila. `selected` gana sobre `unread` a proposito:
 * "lo que acabo de elegir" y "lo que no he mirado" son cosas distintas, y si
 * empatan gana la que el usuario acaba de provocar.
 */
export function tonoDeFila({
  isSelected = false,
  isUnread = false,
}: { isSelected?: boolean; isUnread?: boolean } = {}): string {
  if (isSelected) return 'bg-primary-soft-strong hover:bg-primary-soft-strong';
  if (isUnread) return 'bg-surface-unread hover:bg-surface-unread-hover';
  return 'hover:bg-surface-hover';
}

/**
 * Las clases de una fila de lista, para quien no pueda usar `<ListRow>`.
 *
 * Lo necesitan las dos tablas reales, que tienen que poner esto en su `<tr>`.
 */
export function clasesDeFila({
  density = 'normal',
  isSelected = false,
  isUnread = false,
}: { density?: ListDensity; isSelected?: boolean; isUnread?: boolean } = {}): string {
  return [
    RELLENO[density],
    'border-b border-line last:border-0 transition-colors',
    tonoDeFila({ isSelected, isUnread }),
  ].join(' ');
}

interface ListPanelProps {
  /** Rotulo de la cabecera. Sin el, la lista no pinta cabecera. */
  title?: ReactNode;
  /** Cifra a la derecha de la cabecera: "995 items", "8 resultados". */
  count?: ReactNode;
  /** Lo que se pinta cuando no hay ninguna fila. */
  empty?: ReactNode;
  /** Altura maxima antes de que la lista scrollee por dentro. */
  maxHeight?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * La caja: borde, radio, cabecera opcional y scroll interno.
 *
 * El borde y el radio salen de las fichas, asi que cambiarlos en `tokens.css`
 * los cambia en las cinco listas a la vez.
 */
export function ListPanel({
  title,
  count,
  empty,
  maxHeight,
  children,
  className = '',
}: ListPanelProps) {
  const vacia = children === null || children === undefined ||
    (Array.isArray(children) && children.length === 0);

  return (
    <div className={`overflow-hidden rounded-md border border-line bg-surface ${className}`}>
      {title !== undefined && (
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
          <span className="min-w-0 truncate text-micro font-bold uppercase tracking-wide text-ink-secondary">
            {title}
          </span>
          {count !== undefined && (
            <span className="shrink-0 text-micro tabular-nums text-ink-muted">{count}</span>
          )}
        </div>
      )}

      <div className={maxHeight ? `overflow-y-auto ${maxHeight}` : undefined}>
        {vacia && empty !== undefined ? empty : children}
      </div>
    </div>
  );
}

interface ListRowProps {
  /** `label` para una fila cuya casilla nativa cubre toda la fila. */
  as?: 'div' | 'li' | 'label';
  density?: ListDensity;
  isSelected?: boolean;
  isUnread?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLElement>) => void;
  children?: ReactNode;
  className?: string;
}

/** Una fila, para las listas que no son tablas. */
export function ListRow({
  as: Etiqueta = 'div',
  density = 'normal',
  isSelected = false,
  isUnread = false,
  children,
  className = '',
  ...resto
}: ListRowProps) {
  return (
    <Etiqueta
      className={`flex min-w-0 items-center gap-2 ${clasesDeFila({ density, isSelected, isUnread })} ${className}`}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}
