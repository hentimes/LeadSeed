import { useOnlineDirectory, displayName, avatarFor } from '../../hooks/useOnlineDirectory';

export interface ChatMemberTarget {
  id: string;
  label: string;
  avatarUrl?: string;
}

interface ChatMembersPanelProps {
  currentUserId?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onMention?: (user: ChatMemberTarget) => void;
  onOpenProfile?: (user: ChatMemberTarget) => void;
  onOpenDirectMessage?: (user: ChatMemberTarget) => void;
}

export default function ChatMembersPanel({
  currentUserId,
  search,
  onSearchChange,
  onMention,
  onOpenProfile,
  onOpenDirectMessage,
}: ChatMembersPanelProps) {
  const { users, count } = useOnlineDirectory(search);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface-muted dark:bg-gray-900">
      <div className="p-3 border-b border-line dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar integrante..."
          className="w-full rounded-full border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {count === 0 && (
          <p className="text-center text-sm text-ink-muted mt-8">
            {search ? 'Nadie coincide con la búsqueda.' : 'No hay nadie conectado ahora.'}
          </p>
        )}

        {users.map((user) => {
          const isMe = user.id === currentUserId;
          const name = displayName(user);
          const target: ChatMemberTarget = { id: user.id, label: name, avatarUrl: avatarFor(user) };

          return (
            <div
              key={user.id}
              onDoubleClick={() => {
                if (!isMe) onOpenDirectMessage?.(target);
              }}
              title={isMe ? undefined : `Doble click para escribirle a ${name}`}
              className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-colors ${
                isMe ? '' : 'cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenProfile?.(target)}
                className="relative flex-shrink-0 rounded-full transition-transform hover:scale-105"
                title={`Ver perfil de ${name}`}
              >
                <img
                  src={avatarFor(user)}
                  alt={name}
                  className="w-7 h-7 rounded-full object-cover border border-white dark:border-gray-700"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink dark:text-gray-100 truncate">
                  {name} {isMe && <span className="text-ink-muted font-normal">(tú)</span>}
                </p>
                <p className="text-[10px] text-ink-muted truncate">
                  {isMe ? 'Conectado ahora' : 'Doble click para escribirle'}
                </p>
              </div>

              {!isMe && onMention && (
                <button
                  type="button"
                  onClick={() => onMention(target)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary bg-primary-soft dark:bg-primary/20 hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                  title={`Mencionar a ${name}`}
                >
                  @
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
