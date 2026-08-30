import { Button, Modal } from '../../design';

export type BulkAction = 'helper' | 'remove_helper';

/**
 * Acciones sobre varios usuarios a la vez.
 *
 * ## Por que ya no es un desplegable al pasar el raton
 *
 * Lo era: un `div` con `opacity-0 invisible group-hover:visible`. Eso no
 * existe en pantalla tactil, no se alcanza con el teclado, y su panel de 192px
 * anclado a la derecha se salia del contenedor en cuanto el panel bajaba de
 * 400px. Ademas se cerraba solo con mover el raton un pixel de mas.
 *
 * ## Por que solo hay dos acciones
 *
 * Habia seis. Cuatro -"Banear Usuarios", "Anadir Promocion", "Activar
 * Banners", "Crear Grupo/Lista"- no hacian nada: abrian un `alert` que decia
 * "(Implementacion futura)". No se esta quitando una capacidad, se esta
 * quitando una promesa incumplida; dejarlas en gris con un aviso seria la
 * misma promesa, escrita mas pequena.
 */
export default function AdminBulkActionsModal({
  count,
  isProcessing,
  onClose,
  onRun,
}: {
  count: number;
  isProcessing: boolean;
  onClose: () => void;
  onRun: (action: BulkAction) => void;
}) {
  return (
    <Modal onClose={onClose} maxWidth="380px" label="Acciones sobre la selección">
      <div className="space-y-3 p-4">
        <h3 className="text-card-title font-semibold text-ink">
          {count} usuario{count === 1 ? '' : 's'} seleccionado{count === 1 ? '' : 's'}
        </h3>

        <div className="space-y-1.5">
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={isProcessing}
            onClick={() => onRun('helper')}
          >
            Convertir en helper
          </Button>
          <Button
            variant="ghost-danger"
            className="w-full justify-start"
            disabled={isProcessing}
            onClick={() => onRun('remove_helper')}
          >
            Quitar el rol de helper
          </Button>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
