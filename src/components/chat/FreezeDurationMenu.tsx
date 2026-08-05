import { useState } from 'react';
import { Button, Modal } from '../../design';

interface FreezeDurationMenuProps {
  roomName: string;
  onCancel: () => void;
  onConfirm: (hours: number) => void;
}

const OPTIONS: { label: string; hours: number }[] = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '12 horas', hours: 12 },
  { label: '1 día', hours: 24 },
  { label: '3 días', hours: 72 },
  { label: '7 días', hours: 168 },
];

/** Duracion de la pausa que dispara @silenciar, por horas o dias. */
export default function FreezeDurationMenu({ roomName, onCancel, onConfirm }: FreezeDurationMenuProps) {
  const [hours, setHours] = useState(1);

  return (
    <Modal onClose={onCancel} maxWidth="360px" label={`Pausar ${roomName}`}>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-section-title font-semibold text-ink">Pausar el chat</h2>
        </div>

        <p className="text-sm text-ink-muted">
          Mientras dure la pausa, nadie va a poder escribir en <strong># {roomName}</strong> salvo
          administradores y helpers.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Duración</span>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft"
          >
            {OPTIONS.map((option) => (
              <option key={option.hours} value={option.hours}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onConfirm(hours)}>
            Pausar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
