import { Button, Modal } from '../../design';
import { toPlainText } from '../../utils/mentionParser';

interface ConfirmAnnouncementModalProps {
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmAnnouncementModal({
  content,
  onConfirm,
  onCancel,
}: ConfirmAnnouncementModalProps) {
  return (
    <Modal onClose={onCancel} maxWidth="380px" label="Confirmar anuncio a todos">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
          </svg>
          <h2 className="text-section-title font-semibold text-ink">Anuncio para todos</h2>
        </div>

        <p className="text-sm text-ink-muted">
          Este mensaje le va a llegar a <strong>todos los usuarios</strong>, estén o no conectados
          ahora. ¿Confirmás el envío?
        </p>

        <div className="rounded-xl bg-surface-muted dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 break-words whitespace-pre-wrap">
          {toPlainText(content)}
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Enviar a todos
          </Button>
        </div>
      </div>
    </Modal>
  );
}
