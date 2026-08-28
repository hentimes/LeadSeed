import { useState } from 'react';
import ChatMenuSurface from './ChatMenuSurface';

const REASON_MAX_LENGTH = 40;

interface ReportMessageMenuProps {
  onSubmit: (reason: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function ReportMessageMenu({ onSubmit, onClose, align = 'right' }: ReportMessageMenuProps) {
  const [reason, setReason] = useState('');

  return (
    <ChatMenuSurface
      onClose={onClose}
      align={align}
      width="w-56"
      label="Reportar mensaje"
      className="p-2.5"
    >
      <p className="mb-1.5 text-micro font-bold uppercase tracking-wider text-ink-muted">
        Reportar mensaje
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="¿Por qué lo reportás? (opcional)"
        aria-label="Motivo del reporte"
        rows={2}
        maxLength={REASON_MAX_LENGTH}
        className="w-full resize-none rounded-lg border border-line bg-surface-sunken px-2 py-1.5 text-meta text-ink outline-none transition-colors focus:border-focus"
      />

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-micro text-ink-muted">
          {reason.length}/{REASON_MAX_LENGTH}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-meta font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason.trim())}
            className="text-meta font-semibold text-state-danger hover:underline"
          >
            Reportar
          </button>
        </div>
      </div>
    </ChatMenuSurface>
  );
}
