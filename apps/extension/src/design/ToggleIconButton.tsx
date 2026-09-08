import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Boton-icono que representa un ESTADO, no una accion.
 *
 * Nace de dos implementaciones identicas que existian por separado: los botones
 * de hecho / no aplica de una fila del guion, y los tres de clasificar un
 * criterio. Mismo tamaño, mismos tonos, misma logica de activo e inactivo,
 * escrito dos veces.
 *
 * ## El rol ARIA lo decide quien lo usa, no este componente
 *
 * En una fila son dos botones independientes que se anuncian con
 * `aria-pressed`; en la clasificacion son tres `role="radio"` dentro de un
 * `radiogroup`. Esa diferencia es real y no se puede resolver con una bandera
 * -`asRadio`- sin acabar en el `switch` disfrazado que se queria evitar.
 *
 * Por eso extiende `ButtonHTMLAttributes`: quien lo monta pasa `role`,
 * `aria-checked` o `aria-pressed` y `aria-label` como atributos normales, y
 * este componente solo aporta la forma.
 *
 * ## Relleno suave y nunca solido
 *
 * `bg-{tono}-soft` con `text-{tono}-ink`. El relleno solido se reserva para las
 * acciones (`Button`): un estado que grita como un boton primario compite con
 * lo que de verdad hay que pulsar.
 *
 * El color no viaja solo: el icono lleva la forma -check, prohibido, guion- asi
 * que en escala de grises los estados se siguen distinguiendo (WCAG 1.4.1). Y
 * los 24px son el minimo de objetivo tactil de WCAG 2.5.8.
 */

type Tono = 'success' | 'warning' | 'danger';

const ACTIVO: Record<Tono, string> = {
  success: 'bg-state-success-soft text-state-success-ink border-state-success/40',
  warning: 'bg-state-warning-soft text-state-warning-ink border-state-warning/40',
  danger: 'bg-state-danger-soft text-state-danger-ink border-state-danger/40',
};

const INACTIVO: Record<Tono, string> = {
  success: 'border-transparent text-ink-muted opacity-45 hover:opacity-100 hover:text-state-success-ink',
  warning: 'border-transparent text-ink-muted opacity-45 hover:opacity-100 hover:text-state-warning-ink',
  danger: 'border-transparent text-ink-muted opacity-45 hover:opacity-100 hover:text-state-danger-ink',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  tono: Tono;
  icon: ReactNode;
}

export function ToggleIconButton({ active, tono, icon, className = '', ...rest }: Props) {
  /*
   * El `className` de quien lo usa va al final por convencion, pero conviene
   * saber que eso NO garantiza que gane: Tailwind desempata por el orden de la
   * hoja generada, no por el del string. Es el mismo aviso que ya lleva
   * `Button` sobre `rounded-full` contra `rounded-md`.
   */
  return (
    <button
      type="button"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-30 ${
        active ? ACTIVO[tono] : INACTIVO[tono]
      } ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
