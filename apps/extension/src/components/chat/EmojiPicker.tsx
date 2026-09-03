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

      <div className="absolute bottom-full right-0 z-30 mb-2 max-h-56 w-64 overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-float">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="mb-1 px-1 text-micro font-bold uppercase tracking-wider text-ink-muted">
              {group.label}
            </p>
            {/* 32px de lado: WCAG 2.2 AA (2.5.8) pide 24 minimo y los 28
                anteriores dejaban muy poco margen para el dedo. */}
            <div className="grid grid-cols-7 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  aria-label={`Insertar ${emoji}`}
                  className="h-8 w-8 rounded-lg text-lg leading-none transition-colors hover:bg-surface-hover"
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
