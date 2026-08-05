interface ChatFrozenBannerProps {
  frozenUntil: string;
  isStaff: boolean;
  onUnfreeze: () => void;
}

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

/**
 * Reemplaza el composer mientras la sala esta pausada. El staff sigue
 * viendo el composer normal (puede seguir escribiendo) ademas de esto, con
 * la opcion de reanudar antes de tiempo.
 */
export default function ChatFrozenBanner({ frozenUntil, isStaff, onUnfreeze }: ChatFrozenBannerProps) {
  const when = new Date(frozenUntil).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border-t border-amber-200 dark:border-amber-500/30">
      <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">
        <LockIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">El chat está pausado</p>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
          Vuelve a estar disponible el {when}.
        </p>
      </div>
      {isStaff && (
        <button
          type="button"
          onClick={onUnfreeze}
          className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline flex-shrink-0"
        >
          Reanudar ahora
        </button>
      )}
    </div>
  );
}
