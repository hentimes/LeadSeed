import type { ReactNode } from 'react';

/**
 * Tipografia del producto.
 *
 * Los tamanos salen de los tokens --ls-text-*; cambiarlos ahi los cambia
 * en toda la extension. Los componentes no deben escribir text-[13px]
 * a mano.
 */

export function PageTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-page-title font-semibold tracking-tight text-ink ${className}`}>{children}</h1>;
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-section-title font-semibold tracking-tight text-ink ${className}`}>{children}</h2>;
}

/**
 * Titulo de una tarjeta.
 *
 * `as` existe porque el nivel de encabezado es una decision de estructura, no
 * de estilo, y depende de donde este la tarjeta. Las del panel principal
 * cuelgan directamente de la pagina y son `h2`; una tarjeta dentro de una
 * seccion que ya tiene su propio titulo seria `h3`.
 *
 * El defecto es `h3` para no cambiar el comportamiento que ya tenia esta
 * primitiva. Bajar de nivel "porque la primitiva dice h3" en paginas que no
 * tienen ni h1 ni h2 empeoraria el orden de encabezados en vez de arreglarlo.
 */
export function CardTitle({
  children,
  as: Tag = 'h3',
  className = '',
}: {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}) {
  return <Tag className={`text-card-title font-semibold text-ink ${className}`}>{children}</Tag>;
}

/** Encabezado de grupo: mayusculas pequenas, para separar bloques. */
export function GroupLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-micro font-bold uppercase tracking-widest text-ink-muted ${className}`}>{children}</p>
  );
}

export function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-body text-ink-secondary ${className}`}>{children}</p>;
}

export function Hint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-micro text-ink-muted ${className}`}>{children}</p>;
}
