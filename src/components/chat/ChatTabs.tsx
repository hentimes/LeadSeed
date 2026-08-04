import { Icon } from '../../utils/icons';

export type ChatTab = 'messages' | 'members';

interface ChatTabsProps {
  active: ChatTab;
  onChange: (tab: ChatTab) => void;
  roomName: string;
  onlineCount: number;
}

export default function ChatTabs({ active, onChange, roomName, onlineCount }: ChatTabsProps) {
  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-line dark:border-gray-700 flex justify-between items-center gap-2 z-10 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('messages')}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${
          active === 'messages'
            ? 'bg-primary-soft dark:bg-primary/20 text-primary'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700'
        }`}
      >
        <span className="opacity-70">#</span> {roomName}
      </button>

      {/* Integrantes: icono de avatar con el numero de conectados encima. */}
      <button
        type="button"
        onClick={() => onChange(active === 'members' ? 'messages' : 'members')}
        aria-pressed={active === 'members'}
        title={`Integrantes conectados (${onlineCount})`}
        className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
          active === 'members'
            ? 'bg-primary text-white'
            : 'bg-surface-muted dark:bg-gray-700 text-ink-muted hover:text-ink dark:hover:text-gray-200'
        }`}
      >
        <span className="[&_svg]:!h-[18px] [&_svg]:!w-[18px]">
          <Icon.Users />
        </span>

        {onlineCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
            {onlineCount > 99 ? '99+' : onlineCount}
          </span>
        )}
      </button>
    </div>
  );
}
