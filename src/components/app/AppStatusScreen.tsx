import type { ReactNode } from 'react';

interface AppStatusScreenProps {
  title: string;
  description?: ReactNode;
  className?: string;
  tone?: 'error' | 'neutral' | 'warning';
  icon?: ReactNode;
}

const toneClasses = {
  error: {
    wrapper: 'bg-red-50',
    title: 'text-red-700',
    description: 'text-red-600',
  },
  neutral: {
    wrapper: 'bg-slate-50 dark:bg-slate-900 flex items-center justify-center',
    title: 'text-slate-700 dark:text-slate-200',
    description: 'text-slate-400 dark:text-slate-500',
  },
  warning: {
    wrapper: 'flex h-full items-center justify-center',
    title: 'text-slate-700 dark:text-slate-200',
    description: 'text-slate-400 dark:text-slate-500',
  },
} as const;

export default function AppStatusScreen({
  title,
  description,
  className = 'p-8 h-screen',
  tone = 'neutral',
  icon,
}: AppStatusScreenProps) {
  const styles = toneClasses[tone];

  return (
    <div className={`${className} ${styles.wrapper}`}>
      <div className="text-center max-w-md">
        {icon ? <div className="text-4xl text-amber-500 mb-4 flex justify-center">{icon}</div> : null}
        <h1 className={`font-bold text-lg mb-2 ${styles.title}`}>{title}</h1>
        {description ? <div className={`text-sm ${styles.description}`}>{description}</div> : null}
      </div>
    </div>
  );
}
