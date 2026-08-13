import { useFlipOnOverflow } from '../../hooks/useFlipOnOverflow';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

interface MessageAuthorMenuProps {
  isMuted: boolean;
  isBlocked: boolean;
  onViewProfile: () => void;
  onSendMessage: () => void;
  onToggleMute: () => void;
  onToggleBlock: () => void;
  onClose: () => void;
}

/**
 * Menu que se abre al tocar el nombre o el avatar de otra persona en el chat.
 * Antes "silenciar" vivia como icono suelto en la fila de acciones del
 * mensaje junto con lo que si es especifico de ESE mensaje (guardar,
 * destacar, reportar, responder); como silenciar/bloquear son acciones sobre
 * la PERSONA, no sobre el mensaje puntual, se movieron aca.
 */
export default function MessageAuthorMenu({
  isMuted,
  isBlocked,
  onViewProfile,
  onSendMessage,
  onToggleMute,
  onToggleBlock,
  onClose,
}: MessageAuthorMenuProps) {
  useCloseOnEscape(onClose);
  const itemClass =
    'w-full text-left px-3 py-2 text-xs font-medium text-ink dark:text-gray-100 hover:bg-surface-muted dark:hover:bg-gray-700 transition-colors';
  const { ref, openUpward } = useFlipOnOverflow<HTMLDivElement>();

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      <div
        ref={ref}
        className={`absolute left-0 z-30 w-44 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden py-1 ${
          openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
      >
        <button type="button" onClick={onViewProfile} className={itemClass}>
          Ver perfil
        </button>
        <button type="button" onClick={onSendMessage} className={itemClass}>
          Mensaje privado
        </button>
        <button type="button" onClick={onToggleMute} className={itemClass}>
          {isMuted ? 'Quitar silencio' : 'Silenciar'}
        </button>
        <button
          type="button"
          onClick={onToggleBlock}
          className={`${itemClass} ${isBlocked ? '' : 'text-state-danger hover:text-state-danger'}`}
        >
          {isBlocked ? 'Desbloquear' : 'Bloquear'}
        </button>
      </div>
    </>
  );
}
