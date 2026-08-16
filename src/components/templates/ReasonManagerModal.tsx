import { Button, IconButton, Input, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import { MAX_REASON_LENGTH, type MessageReason } from '../../services/messageReasonsService';

interface Props {
  motivos: MessageReason[];
  texto: string;
  error: string;
  onTextoChange: (valor: string) => void;
  onCrear: (e: React.FormEvent) => void;
  onEliminar: (id: number) => void;
  onClose: () => void;
}

/**
 * Administracion del catalogo de motivos.
 *
 * Vive en un dialogo y no en un panel desplegable dentro de la pagina. El panel
 * empujaba la lista de plantillas fuera de la pantalla, y **crecia sin limite**:
 * con cien motivos, abrirlo dejaba la pagina inservible. Aqui la lista tiene su
 * propio scroll y el alto del dialogo no depende de cuantos haya.
 *
 * El formulario va arriba y fijo: crear es la razon por la que se abre esto, y
 * no deberia haber que bajar hasta el final de cien filas para llegar al campo.
 */
export function ReasonManagerModal({
  motivos,
  texto,
  error,
  onTextoChange,
  onCrear,
  onEliminar,
  onClose,
}: Props) {
  return (
    <Modal onClose={onClose} maxWidth="400px" label="Motivos del mensaje">
      <div className="flex max-h-[80vh] min-h-0 flex-col">
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div className="min-w-0">
            <h2 className="text-card-title font-semibold text-ink">Motivos del mensaje</h2>
            <p className="mt-0.5 text-micro text-ink-secondary">
              Sustituyen a <code className="font-mono">{'{motivo}'}</code> en tus plantillas. Eliges
              cual usar en cada envio.
            </p>
          </div>
          <IconButton icon={<Icon.Close />} label="Cerrar" size="sm" onClick={onClose} />
        </div>

        <form onSubmit={onCrear} className="flex gap-2 px-4 pt-3">
          <Input
            value={texto}
            onChange={(e) => onTextoChange(e.target.value)}
            placeholder="vi que tu empresa tiene convenio"
            aria-label="Nuevo motivo"
            maxLength={MAX_REASON_LENGTH}
            className="min-w-0 flex-1"
            required
            autoFocus
          />
          <Button type="submit" variant="primary">Crear</Button>
        </form>

        {error && (
          <p role="alert" className="px-4 pt-2 text-micro text-state-danger">{error}</p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {motivos.length === 0 ? (
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="text-micro text-ink-secondary">Tu plantilla dice:</p>
              <p className="mt-1 text-body text-ink">
                Hola Maria, te escribo porque{' '}
                <span className="rounded bg-primary-soft px-1 font-mono text-primary">{'{motivo}'}</span>.
              </p>
              <p className="mt-2.5 text-micro text-ink-secondary">Al enviar, tu eliges cual:</p>
              <p className="mt-1 text-body text-ink">
                Hola Maria, te escribo porque{' '}
                <span className="font-medium text-primary">vi que tu empresa tiene convenio</span>.
              </p>
            </div>
          ) : (
            <ul className="min-w-0">
              {motivos.map((motivo) => (
                <li
                  key={motivo.id}
                  className="flex min-w-0 items-center gap-2 border-b border-line-soft py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1 break-words text-body text-ink">{motivo.text}</span>
                  <IconButton
                    icon={<Icon.Trash />}
                    label={`Eliminar el motivo ${motivo.text}`}
                    size="sm"
                    variant="ghost-danger"
                    className="shrink-0"
                    onClick={() => motivo.id != null && onEliminar(motivo.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
