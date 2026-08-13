import { useFlipOnOverflow } from '../../hooks/useFlipOnOverflow';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

interface PinDurationMenuProps {
  onSelect: (hours: number) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

const OPTIONS: { label: string; hours: number }[] = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '24 horas', hours: 24 },
  { label: '3 días', hours: 72 },
];

export default function PinDurationMenu({ onSelect, onClose, align = 'right' }: PinDurationMenuProps) {
  useCloseOnEscape(onClose);
  const { ref, openUpward } = useFlipOnOverflow<HTMLDivElement>();

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      <div
        ref={ref}
        className={`absolute z-30 w-36 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
      >
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          Fijar por
        </p>
        {OPTIONS.map((option) => (
          <button
            key={option.hours}
            type="button"
            onClick={() => onSelect(option.hours)}
            className="w-full text-left px-3 py-1.5 text-xs text-ink dark:text-gray-100 hover:bg-surface-muted dark:hover:bg-gray-700 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
