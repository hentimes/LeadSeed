import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // Para botones de acción (ej. + Nuevo lead) a la derecha
  icon?: ReactNode; // Ícono opcional al lado del título
}

export default function PageHeader({ title, description, children, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--ls-text,#111827)] dark:text-white leading-[30px]">
          {icon && <span className="text-[var(--ls-primary,#6C4CF6)] w-6 h-6 flex items-center justify-center">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] font-normal leading-[18px] text-[var(--ls-text-muted,#667085)] dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
