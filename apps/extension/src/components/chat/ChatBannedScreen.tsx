import type { ChatUserBan } from '../../services/chatModerationService';
import { formatearFechaHora } from '../../utils/date';

interface ChatBannedScreenProps {
  ban: ChatUserBan;
}

/**
 * La fecha usaba `toLocaleString([])` sin idioma: en un equipo configurado en
 * ingles el dia y el mes salian dados vuelta. `formatearFechaHora` ya fija
 * `es-CL` para todo el producto.
 */
function formatRemaining(bannedUntil: string | null): string {
  if (!bannedUntil) return 'El baneo no tiene fecha de fin.';

  const target = new Date(bannedUntil);
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Tu baneo está por levantarse.';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const when = formatearFechaHora(bannedUntil);

  if (days >= 1) {
    return `Podés volver a escribir el ${when} (en ${days} ${days === 1 ? 'día' : 'días'}).`;
  }
  return `Podés volver a escribir el ${when} (en ${hours} ${hours === 1 ? 'hora' : 'horas'}).`;
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

      <p className="text-body text-ink-muted max-w-xs">
        {ban.reason || 'Te baneamos por infringir las reglas de la sala.'}
      </p>

      <p className="text-meta font-semibold text-state-danger">{formatRemaining(ban.banned_until)}</p>
    </div>
  );
}
