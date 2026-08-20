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
  /** Pie: normalmente `<ListPagination>`. */
  footer?: ReactNode;
  /**
   * Sin borde ni radio: la lista ocupa todo el ancho de su contenedor y se
   * apoya en el, en vez de dibujar una caja dentro de otra caja.
   *
   * Es el aspecto de la lista de inscripcion a flujos, que es el que el
   * producto adopto como referencia: una caja con borde metida dentro de una
   * tarjeta que ya tiene borde se lee como dos marcos anidados, y en un panel
   * de 360px eso ademas cuesta 24px de ancho util.
   */
  flush?: boolean;
  /**
   * Altura maxima antes de scrollear por dentro. Sin ella la lista crece con
   * su contenido y, si el padre es flex, se estira para ocupar lo que haya.
   */
  maxHeight?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * La caja: cabecera opcional, cuerpo con scroll y pie opcional.
 *
 * El borde y el radio salen de las fichas, asi que cambiarlos en `tokens.css`
 * los cambia en todas las listas a la vez.
 */
export function ListPanel({
  title,
  count,
  empty,
  footer,
  flush = false,
  maxHeight,
  children,
  className = '',
}: ListPanelProps) {
  const vacia = children === null || children === undefined ||
    (Array.isArray(children) && children.length === 0);

  const caja = flush
    ? 'flex min-h-0 flex-col'
    : 'flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface';

  return (
    <div className={`${caja} ${className}`}>
      {title !== undefined && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
          <span className="min-w-0 truncate text-micro font-bold uppercase tracking-wide text-ink-secondary">
            {title}
          </span>
          {count !== undefined && (
            <span className="shrink-0 text-micro tabular-nums text-ink-muted">{count}</span>
          )}
        </div>
      )}

      <div className={`min-h-0 flex-1 ${maxHeight ? `overflow-y-auto ${maxHeight}` : 'overflow-y-auto'}`}>
        {vacia && empty !== undefined ? empty : children}
      </div>

      {footer !== undefined && (
        <div className="shrink-0 border-t border-line bg-surface-muted px-2 py-1.5">{footer}</div>
      )}
    </div>
  );
}

interface ListPaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const BOTON_PAGINA =
  'h-7 min-w-[28px] px-1 flex items-center justify-center rounded-[6px] text-micro font-medium transition-colors';

/**
 * Paginacion de lista.
 *
 * Existe porque solo la tabla de leads paginaba. El resto cortaba por lo sano
 * -flujos se quedaba en los primeros 50 leads sin decirlo, y el selector de
 * destinatarios pintaba los mil de golpe dentro de un alto fijo-, asi que en
 * ninguno de los dos habia forma de llegar al lead 51.
 *
 * El aspecto sale de la paginacion que ya tenia la tabla de leads: era la unica
 * que existia, asi que es la referencia.
 */
export function ListPagination({ page, pageCount, onPageChange, disabled = false }: ListPaginationProps) {
  if (pageCount <= 1) return null;

  const paginas: number[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - 1 && p <= page + 1)) paginas.push(p);
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <button
        type="button"
        aria-label="Pagina anterior"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || disabled}
        className={`${BOTON_PAGINA} text-ink-secondary hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>

      {paginas.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && paginas[i - 1] !== p - 1 && (
            <span className="px-1 text-micro text-ink-muted">…</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(p)}
            disabled={disabled}
            aria-current={p === page ? 'page' : undefined}
            className={`${BOTON_PAGINA} ${
              p === page ? 'bg-primary-soft text-primary' : 'text-ink-secondary hover:bg-surface-hover'
            }`}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        type="button"
        aria-label="Pagina siguiente"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount || disabled}
        className={`${BOTON_PAGINA} text-ink-secondary hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
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
