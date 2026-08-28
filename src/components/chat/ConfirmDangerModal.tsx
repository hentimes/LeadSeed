import { Button, Modal } from '../../design';

interface ConfirmDangerModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmacion generica para acciones destructivas del chat (@limpiar, @purgar). */
export default function ConfirmDangerModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDangerModalProps) {
  return (
    <Modal onClose={onCancel} maxWidth="380px" label={title}>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-state-danger">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 className="text-section-title font-semibold text-ink">{title}</h2>
        </div>

        <p className="text-body text-ink-muted">{message}</p>

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
