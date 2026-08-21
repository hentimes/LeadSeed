import type { ReactNode } from 'react';

/**
 * Chip que se enciende y se apaga.
 *
 * Es la forma que ya tenian los chips de lista del selector de destinatarios,
 * extraida para que la usen tambien los filtros. Se saca a una pieza propia y
 * no se copia porque este proyecto ya pago el precio de copiar controles de
 * lista: acabaron siendo siete variantes de la misma cosa.
 *
 * `aria-pressed` y no una casilla: es un interruptor de dos estados sobre lo
 * que se ve, no un dato del formulario.
 */
export function ToggleChip({
  active,
  onClick,
  children,
  count,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Cifra a la derecha, si el chip cuenta algo. */
  count?: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-micro font-medium transition-colors ${
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
      }`}
    >
      <span className="max-w-[140px] truncate">{children}</span>
      {count !== undefined && (
        <span className={`tabular-nums ${active ? 'opacity-75' : 'text-ink-muted'}`}>{count}</span>
      )}
    </button>
  );
}
