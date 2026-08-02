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

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-card-title font-semibold text-ink ${className}`}>{children}</h3>;
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
