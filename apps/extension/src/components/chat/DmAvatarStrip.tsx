import { Avatar, CountBadge } from '../../design';
import type { DmSession } from '../../types';

interface DmAvatarStripProps {
  sessions: DmSession[];
  onToggle: (session: DmSession) => void;
}

/**
 * Avatares de conversaciones directas en la barra superior del chat. Minimizar
 * una ventana la devuelve aca; un mensaje nuevo de alguien sin ventana abierta
 * tambien aparece aca con un contador, en vez de abrirsele encima a la otra
 * persona.
 *
 * Se muestran como mucho dos. La tira no tenia tope: con tres conversaciones
 * abiertas empujaba fuera de la barra a los botones de guardados y reportes, y
 * como los scrollbars estan ocultos globalmente el desborde no avisaba. Las
 * que no caben se cuentan en un "+N" que las devuelve al tocarlo.
 */
const MAXIMO_VISIBLE = 2;

export default function DmAvatarStrip({ sessions, onToggle }: DmAvatarStripProps) {
  if (sessions.length === 0) return null;

  const visibles = sessions.slice(0, MAXIMO_VISIBLE);
  const ocultas = sessions.slice(MAXIMO_VISIBLE);
  const sinLeerOcultas = ocultas.reduce((total, sesion) => total + sesion.unreadCount, 0);

  return (
    <div className="mr-1 flex items-center gap-1.5 border-r border-line pl-1 pr-2">
      {visibles.map((session) => (
        <button
          key={session.userId}
          type="button"
          onClick={() => onToggle(session)}
          title={session.label}
          aria-label={
            session.minimized
              ? `Abrir conversación con ${session.label}`
              : `Minimizar conversación con ${session.label}`
          }
          className="relative shrink-0 rounded-full transition-transform hover:scale-105"
        >
          <Avatar
            name={session.label}
            src={session.avatarUrl}
            size="lg"
            ring={session.minimized ? 'surface' : 'active'}
          />
          <CountBadge count={session.unreadCount} tone="danger" max={9} />
        </button>
      ))}

      {ocultas.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const primera = ocultas[0];
            if (primera) onToggle(primera);
          }}
          title={`${ocultas.length} conversación${ocultas.length === 1 ? '' : 'es'} más`}
          aria-label={`${ocultas.length} conversaciones más`}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-micro font-bold text-ink-secondary transition-colors hover:bg-surface-hover"
        >
          +{ocultas.length}
          <CountBadge count={sinLeerOcultas} tone="danger" max={9} />
        </button>
      )}
    </div>
  );
}
