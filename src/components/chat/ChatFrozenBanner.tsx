import { ChatIcon } from './ChatIcons';
import { formatearFechaHora } from '../../utils/date';

interface ChatFrozenBannerProps {
  frozenUntil: string;
  isStaff: boolean;
  onUnfreeze: () => void;
}

/**
 * Reemplaza el composer mientras la sala esta pausada. El staff sigue
 * viendo el composer normal (puede seguir escribiendo) ademas de esto, con
 * la opcion de reanudar antes de tiempo.
 *
 * El ambar viene de `--ls-accent` desde el 2026-08-25. Antes eran seis clases
 * `amber-*` de Tailwind con su `dark:` al lado, y la segunda linea
 * (`text-amber-700/80`) daba 2.9:1 sobre su propio fondo: por debajo de AA.
 */
export default function ChatFrozenBanner({ frozenUntil, isStaff, onUnfreeze }: ChatFrozenBannerProps) {
  return (
    <div className="flex items-center gap-3 border-t border-accent-border bg-accent-soft p-3">
      <span className="shrink-0 text-accent">
        <ChatIcon.Lock className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold text-accent-strong">La sala está pausada</p>
        <p className="text-micro text-accent">Se reabre el {formatearFechaHora(frozenUntil)}.</p>
      </div>

      {isStaff && (
        <button
          type="button"
          onClick={onUnfreeze}
          className="shrink-0 text-meta font-semibold text-accent-strong hover:underline"
        >
          Reanudar ahora
        </button>
      )}
    </div>
  );
}
