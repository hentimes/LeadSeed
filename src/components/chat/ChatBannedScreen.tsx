import type { ChatUserBan } from '../../services/chatModerationService';

interface ChatBannedScreenProps {
  ban: ChatUserBan;
}

function formatRemaining(bannedUntil: string | null): string {
  if (!bannedUntil) return 'Baneo permanente.';

  const target = new Date(bannedUntil);
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Tu baneo está por levantarse.';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  const when = target.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (days >= 1) return `Vuelve a estar habilitado el ${when} (en ${days} ${days === 1 ? 'día' : 'días'}).`;
  return `Vuelve a estar habilitado el ${when} (en ${hours} ${hours === 1 ? 'hora' : 'horas'}).`;
}

export default function ChatBannedScreen({ ban }: ChatBannedScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-state-danger-soft text-state-danger">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
        </svg>
      </span>

      <h2 className="text-section-title font-semibold text-ink">Fuiste baneado del chat</h2>

      <p className="text-sm text-ink-muted max-w-xs">
        {ban.reason || 'Se te baneó por infringir las reglas de la sala.'}
      </p>

      <p className="text-xs font-semibold text-state-danger">{formatRemaining(ban.banned_until)}</p>
    </div>
  );
}
