import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export default function IconActionButton({
  icon,
  label,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={[
        'app-tooltip-trigger flex h-8 w-8 items-center justify-center border border-transparent text-[color:var(--app-muted)] transition hover:bg-[color:var(--app-surface)] hover:text-[color:var(--app-ink)] disabled:opacity-40',
        className,
      ].join(' ')}
    >
      {icon}
      <span className="app-tooltip">{label}</span>
    </button>
  );
}
