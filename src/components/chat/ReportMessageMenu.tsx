import { useState } from 'react';
import { useFlipOnOverflow } from '../../hooks/useFlipOnOverflow';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

const REASON_MAX_LENGTH = 40;

interface ReportMessageMenuProps {
  onSubmit: (reason: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function ReportMessageMenu({ onSubmit, onClose, align = 'right' }: ReportMessageMenuProps) {
  useCloseOnEscape(onClose);
  const [reason, setReason] = useState('');
  const { ref, openUpward } = useFlipOnOverflow<HTMLDivElement>();

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      <div
        ref={ref}
        className={`absolute z-30 w-56 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2.5 ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
          Reportar mensaje
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          rows={2}
          maxLength={REASON_MAX_LENGTH}
          className="w-full resize-none rounded-lg border border-line dark:border-gray-700 bg-surface-muted dark:bg-gray-900 px-2 py-1.5 text-xs text-ink dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-ink-muted">
            {reason.length}/{REASON_MAX_LENGTH}
          </span>
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-ink-muted hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason.trim())}
            className="text-[11px] font-semibold text-state-danger hover:underline"
          >
            Reportar
          </button>
        </div>
      </div>
    </>
  );
}
