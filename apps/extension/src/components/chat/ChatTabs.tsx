import { CountBadge } from '../../design';
import { ChatIcon } from './ChatIcons';
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

/**
 * Barra superior de la sala.
 *
 * Llevaba `bg-white dark:bg-gray-800` y `border-gray-700`: colores literales
 * que no siguen a la ficha. Ahora es `bg-surface` sobre `border-line`, y se le
 * quito la sombra: borde MAS sombra duplicaban la misma separacion.
 *
 * El chip de la sala gana un chevron. Antes parecia solo un titulo, asi que la
 * informacion que hay detras -descripcion, reglas, integrantes, destacados,
 * baneados- no la encontraba nadie.
 */
function BotonDePanel({
  active,
  onClick,
  label,
  count,
  tone = 'primary',
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'primary' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} (${count})`}
      aria-label={`${label}, ${count}`}
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        active
          ? 'bg-primary text-ink-inverse'
          : 'bg-surface-sunken text-ink-muted hover:text-ink'
      }`}
    >
      {children}
      {!active && <CountBadge count={count} tone={tone} />}
    </button>
  );
}

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
    <div className="z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
      {/* Chip de sala: el conteo de conectados vive solo aca, no se repite
          en ningun otro icono de la barra. */}
      <button
        type="button"
        onClick={onOpenRoomInfo}
        title="Ver información de la sala"
        aria-label={`Información de la sala ${roomName}`}
        className="group -ml-1 flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-surface-hover"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-meta font-bold text-primary">
          #
        </span>

        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="flex min-w-0 items-center gap-1 text-meta font-semibold text-ink transition-colors group-hover:text-primary">
            <span className="truncate">{roomName}</span>
            {isFrozen && (
              <span className="shrink-0 text-accent" title="Sala pausada">
                <ChatIcon.Lock className="h-3 w-3" />
              </span>
            )}
            <ChatIcon.Chevron className="h-3 w-3 shrink-0 text-ink-muted" />
          </span>

          <span className="flex items-center gap-1 text-micro text-ink-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-state-success" />
            {onlineCount} conectado{onlineCount === 1 ? '' : 's'}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <DmAvatarStrip sessions={dmSessions} onToggle={onToggleDmSession} />

        {isStaff && (
          <BotonDePanel
            active={active === 'reports'}
            onClick={() => onChange(active === 'reports' ? 'messages' : 'reports')}
            label="Reportes pendientes"
            count={pendingReportCount}
            tone="danger"
          >
            <ChatIcon.Flag className="h-[17px] w-[17px]" />
          </BotonDePanel>
        )}

        <BotonDePanel
          active={active === 'saved'}
          onClick={() => onChange(active === 'saved' ? 'messages' : 'saved')}
          label="Mensajes guardados"
          count={savedCount}
        >
          <ChatIcon.Bookmark className="h-[17px] w-[17px]" filled={active === 'saved'} />
        </BotonDePanel>
      </div>
    </div>
  );
}
