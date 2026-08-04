import type { ReactNode } from 'react';
import { Button, Modal } from '../../design';

/**
 * Confirmacion de envio, comun a los tres canales.
 *
 * Los tres modales anteriores estaban armados a mano con `fixed inset-0`
 * dentro del arbol de la app. Eso es justo lo que el sistema de diseno
 * prohibe: un elemento `fixed` se posiciona contra el primer ancestro con
 * `transform`, `filter` o `contain`, no contra el viewport, y los modales
 * vivian dentro de `<main>`, que ademas scrollea. Por eso aparecian
 * recortados. `Modal` los monta con portal a `document.body`.
 */
export function SendConfirmModal({
  title,
  subtitle,
  rows,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  subtitle: string;
  rows: { label: string; value: ReactNode }[];
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel} maxWidth="380px" label={title}>
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-section-title font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-micro text-ink-muted">{subtitle}</p>
      </header>

      <div className="flex flex-col gap-2.5 px-4 py-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <span className="block text-micro font-bold uppercase tracking-widest text-ink-muted">
              {row.label}
            </span>
            <div className="mt-0.5 text-body text-ink">{row.value}</div>
          </div>
        ))}
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </footer>
    </Modal>
  );
}

/** Lista de nombres que se corta con un resumen, para el cuerpo del modal. */
export function RecipientSummary({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;

  return (
    <span className="break-words">
      {shown.join(', ')}
      {rest > 0 && (
        <span className="text-ink-muted" title={names.slice(3).join(', ')}>
          {' '}
          y {rest} más
        </span>
      )}
    </span>
  );
}
