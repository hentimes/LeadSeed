import { useState } from 'react';
import { Button, Modal } from '../../design';

interface BanUserMenuProps {
  userName: string;
  onCancel: () => void;
  onConfirm: (reason: string, bannedUntil: string | null) => void;
}

const DURATION_OPTIONS: { label: string; hours: number | null }[] = [
  { label: '1 hora', hours: 1 },
  { label: '24 horas', hours: 24 },
  { label: '3 días', hours: 72 },
  { label: '7 días', hours: 168 },
  { label: 'Indefinido', hours: null },
];

export default function BanUserMenu({ userName, onCancel, onConfirm }: BanUserMenuProps) {
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState<number | null>(24);

  const fieldClass =
    'w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft';

  return (
    <Modal onClose={onCancel} maxWidth="360px" label={`Banear a ${userName}`}>
      <div className="flex flex-col gap-3 p-5">
        <h2 className="text-section-title font-semibold text-ink">Banear a {userName}</h2>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Duración</span>
          <select
            value={hours === null ? 'indefinite' : String(hours)}
            onChange={(e) => setHours(e.target.value === 'indefinite' ? null : Number(e.target.value))}
            className={fieldClass}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.label} value={option.hours === null ? 'indefinite' : option.hours}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Motivo</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Por qué se banea a este usuario..."
            className={`${fieldClass} resize-none`}
          />
        </label>

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const bannedUntil = hours === null ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
              onConfirm(reason.trim(), bannedUntil);
            }}
          >
            Banear
          </Button>
        </div>
      </div>
    </Modal>
  );
}
