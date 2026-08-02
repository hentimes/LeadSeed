import type { ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-secondary border-line',
  primary: 'bg-primary-soft text-primary border-primary-soft-strong',
  success: 'bg-state-success-soft text-state-success border-state-success/25',
  warning: 'bg-state-warning-soft text-state-warning border-state-warning/25',
  danger: 'bg-state-danger-soft text-state-danger border-state-danger/25',
  info: 'bg-state-info-soft text-state-info border-state-info/25',
};

/**
 * Etiqueta compacta de estado. Reemplaza los `span` con colores literales
 * repetidos para estados de lead, badges de lista y avisos.
 */
export function Badge({
  children,
  tone = 'neutral',
  className = '',
  /** Color libre, para listas del usuario que traen su propio color. */
  color,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  color?: string;
}) {
  if (color) {
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-micro font-medium ${className}`}
        style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-micro font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
