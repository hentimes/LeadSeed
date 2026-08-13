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
 */
export default function DmAvatarStrip({ sessions, onToggle }: DmAvatarStripProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-line dark:border-gray-700 mr-1">
      {sessions.map((session) => (
        <button
          key={session.userId}
          type="button"
          onClick={() => onToggle(session)}
          className="relative flex-shrink-0"
          title={session.label}
        >
          <img
            src={
              session.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(session.label)}&background=3b82f6&color=fff`
            }
            alt={session.label}
            className={`w-8 h-8 rounded-full object-cover border-2 transition-transform hover:scale-105 ${
              session.minimized ? 'border-white dark:border-gray-800' : 'border-primary'
            }`}
          />
          {session.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
              {session.unreadCount > 9 ? '9+' : session.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
