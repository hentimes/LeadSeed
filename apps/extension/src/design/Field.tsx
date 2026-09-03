import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/**
 * CONTROLES DE FORMULARIO
 *
 * Faltaban en el sistema: cada seccion escribia su propio input con
 * `border rounded px-2 py-1.5 text-sm` y un color de foco distinto segun
 * el modulo (verde en WhatsApp, azul en Email, ambar en Llamadas). El
 * resultado era que el mismo campo se veia diferente en cada pestana.
 *
 * El foco es siempre el morado de marca. El color de canal se usa para
 * identificar la pestana, no para pintar los campos.
 *
 * `Input` y `Textarea` reenvian la ref porque el editor de plantillas
 * inserta variables en la posicion del cursor (`insertTextAtCursor`) y
 * necesita el nodo real.
 */

const CONTROL =
  'rounded-md border border-line bg-surface text-body text-ink transition-colors ' +
  'placeholder:text-ink-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted';

/**
 * El ancho se resuelve aca y no concatenando `w-auto` sobre `w-full`: dos
 * utilidades de la misma propiedad no se desempatan por el orden en el
 * atributo `class` sino por el orden en la hoja generada, que no
 * controlamos.
 */
const width = (full: boolean) => (full ? 'w-full' : 'w-auto');

/** Etiqueta + control + pista, con el ritmo vertical unico del producto. */
export function Field({
  label,
  hint,
  action,
  children,
  className = '',
}: {
  label?: ReactNode;
  hint?: ReactNode;
  /** Control secundario alineado a la derecha de la etiqueta. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {(label || action) && (
        <div className="mb-1 flex min-w-0 items-end justify-between gap-2">
          {label && <label className="block truncate text-micro font-medium text-ink-secondary">{label}</label>}
          {action}
        </div>
      )}
      {children}
      {hint && <p className="mt-1 text-micro text-ink-muted">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean }
>(function Input({ className = '', fullWidth = true, ...rest }, ref) {
  return <input ref={ref} {...rest} className={`${CONTROL} ${width(fullWidth)} h-control px-2.5 ${className}`} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { fullWidth?: boolean }
>(function Textarea({ className = '', fullWidth = true, ...rest }, ref) {
  return (
    <textarea ref={ref} {...rest} className={`${CONTROL} ${width(fullWidth)} resize-y px-2.5 py-2 ${className}`} />
  );
});

export function Select({
  className = '',
  fullWidth = true,
  compact = false,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { fullWidth?: boolean; compact?: boolean }) {
  return (
    <select
      {...rest}
      className={`${CONTROL} ${width(fullWidth)} cursor-pointer px-2 ${
        compact ? 'h-control-sm text-micro' : 'h-control'
      } ${className}`}
    >
      {children}
    </select>
  );
}

/** Casilla con su etiqueta, clicable completa. */
export function Checkbox({
  label,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-micro text-ink-secondary select-none ${className}`}
    >
      <input
        {...rest}
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)] focus:ring-1 focus:ring-primary"
      />
      {label}
    </label>
  );
}
