import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
/**
 * Selector de emoticones curado.
 *
 * Se usa una lista propia en vez de una libreria de emojis: el paquete completo
 * pesa cientos de kilobytes y esto es un panel de extension, donde el peso del
 * bundle se nota. Estos son los que se usan en una conversacion de trabajo.
 */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Caras',
    emojis: ['😀', '😄', '😅', '😂', '🙂', '😉', '😊', '😍', '😎', '🤔', '😐', '😕', '😢', '😡', '😴', '🤝'],
  },
  {
    label: 'Gestos',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👌', '✌️', '👋', '🤙'],
  },
  {
    label: 'Trabajo',
    emojis: ['✅', '❌', '⚠️', '📌', '📎', '📅', '📈', '📉', '💰', '💡', '🔥', '⭐', '🎯', '🚀', '⏰', '📞'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  useCloseOnEscape(onClose);
  return (
    <>
      {/* Capa de cierre: un click fuera baja el panel. */}
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      <div className="absolute bottom-full right-0 mb-2 z-30 w-64 max-h-56 overflow-y-auto rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="h-7 w-7 rounded-lg text-lg leading-none hover:bg-surface-muted dark:hover:bg-gray-700 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
