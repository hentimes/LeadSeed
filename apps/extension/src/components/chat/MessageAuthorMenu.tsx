import ChatMenuSurface, { ChatMenuItem } from './ChatMenuSurface';

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
  return (
    <ChatMenuSurface onClose={onClose} align="left" label="Acciones sobre la persona">
      <ChatMenuItem onClick={onViewProfile}>Ver perfil</ChatMenuItem>
      <ChatMenuItem onClick={onSendMessage}>Mensaje privado</ChatMenuItem>
      <ChatMenuItem onClick={onToggleMute}>{isMuted ? 'Quitar silencio' : 'Silenciar'}</ChatMenuItem>
      <ChatMenuItem onClick={onToggleBlock} tone={isBlocked ? 'neutral' : 'danger'}>
        {isBlocked ? 'Desbloquear' : 'Bloquear'}
      </ChatMenuItem>
    </ChatMenuSurface>
  );
}
