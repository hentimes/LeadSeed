import DmAvatarStrip from './DmAvatarStrip';
import type { DmSession } from '../../types';

export type ChatTab = 'messages' | 'saved' | 'reports';

interface ChatTabsProps {
  active: ChatTab;
  onChange: (tab: ChatTab) => void;
  roomName: string;
  onlineCount: number;
  savedCount: number;
  dmSessions: DmSession[];
  onToggleDmSession: (session: DmSession) => void;
  isStaff: boolean;
  pendingReportCount: number;
  onOpenRoomInfo: () => void;
  isFrozen?: boolean;
}

const BookmarkIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function ChatTabs({
  active,
  onChange,
  roomName,
  onlineCount,
  savedCount,
  dmSessions,
  onToggleDmSession,
  isStaff,
  pendingReportCount,
  onOpenRoomInfo,
  isFrozen = false,
}: ChatTabsProps) {
  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-line dark:border-gray-700 flex justify-between items-center gap-2 z-10 shadow-sm">
      {/* Chip de sala: el conteo de conectados vive solo aca, no se repite
          en ningun otro icono de la barra. */}
      <button
        type="button"
        onClick={onOpenRoomInfo}
        title="Ver información de la sala"
        className="group flex items-center gap-2 rounded-lg -ml-1.5 px-1.5 py-1 hover:bg-surface-muted dark:hover:bg-gray-700/60 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft dark:bg-primary/20 text-primary text-sm font-bold flex-shrink-0">
          #
        </span>
        <span className="flex flex-col items-start leading-tight min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold text-ink dark:text-gray-100 group-hover:text-primary transition-colors max-w-[140px]">
            <span className="truncate">{roomName}</span>
            {isFrozen && (
              <span className="text-amber-600 dark:text-amber-400 flex-shrink-0" title="Chat pausado">
                <LockIcon />
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            {onlineCount} conectado{onlineCount === 1 ? '' : 's'}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        <DmAvatarStrip sessions={dmSessions} onToggle={onToggleDmSession} />

        {isStaff && (
          <button
            type="button"
            onClick={() => onChange(active === 'reports' ? 'messages' : 'reports')}
            aria-pressed={active === 'reports'}
            title={`Reportes pendientes (${pendingReportCount})`}
            className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
              active === 'reports'
                ? 'bg-primary text-white'
                : 'bg-surface-muted dark:bg-gray-700 text-ink-muted hover:text-ink dark:hover:text-gray-200'
            }`}
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>

            {pendingReportCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
                {pendingReportCount > 99 ? '99+' : pendingReportCount}
              </span>
            )}
          </button>
        )}

        {/* Guardados: icono de marcador. */}
        <button
          type="button"
          onClick={() => onChange(active === 'saved' ? 'messages' : 'saved')}
          aria-pressed={active === 'saved'}
          title={`Mensajes guardados (${savedCount})`}
          className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            active === 'saved'
              ? 'bg-primary text-white'
              : 'bg-surface-muted dark:bg-gray-700 text-ink-muted hover:text-ink dark:hover:text-gray-200'
          }`}
        >
          <BookmarkIcon />

          {savedCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
              {savedCount > 99 ? '99+' : savedCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
