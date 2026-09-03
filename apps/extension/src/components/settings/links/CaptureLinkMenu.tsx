import type { CaptureLink } from '../../../types';
import { useCloseOnEscape } from '../../../hooks/useCloseOnEscape';

interface Props {
  link: CaptureLink;
  showDefaultConcept: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMakeDefault: () => void;
  onToggleActive: () => void;
  onResetProgress: () => void;
}

/**
 * Acciones secundarias de un link.
 *
 * Antes eran hasta cuatro botones de texto en una fila propia debajo de cada
 * link: en un panel angosto se partian en dos lineas y sumaban 60px por link.
 * Aqui solo queda visible Copiar, que es a lo que se entra a esta pantalla; el
 * resto se pide desde este menu.
 */
export default function CaptureLinkMenu({
  link,
  showDefaultConcept,
  onClose,
  onEdit,
  onMakeDefault,
  onToggleActive,
  onResetProgress,
}: Props) {
  useCloseOnEscape(onClose);

  const itemClass =
    'w-full px-3 py-2 text-left text-micro font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:bg-surface-muted';

  const ejecutar = (accion: () => void) => {
    onClose();
    accion();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="menu"
        className="absolute right-0 top-7 z-50 w-44 overflow-hidden rounded-md border border-line bg-surface shadow-float animate-fade-in"
      >
        <button type="button" role="menuitem" className={itemClass} onClick={() => ejecutar(onEdit)}>
          Editar
        </button>

        {showDefaultConcept && !link.isDefault && (
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => ejecutar(onMakeDefault)}
          >
            Hacer principal
          </button>
        )}

        {/* El link principal no se puede desactivar: en vez de ofrecerlo y
            responder con un error, no aparece. */}
        {!(showDefaultConcept && link.isDefault) && (
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} ${link.isActive ? 'text-state-danger hover:text-state-danger' : ''}`}
            onClick={() => ejecutar(onToggleActive)}
          >
            {link.isActive ? 'Desactivar' : 'Reactivar'}
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          className={`${itemClass} border-t border-line`}
          onClick={() => ejecutar(onResetProgress)}
        >
          Resetear visitas y pasos
        </button>
      </div>
    </>
  );
}
