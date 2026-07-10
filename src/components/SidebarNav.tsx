import type { ReactNode } from 'react';
import type { Page } from '../types';
import { primaryRoutes, secondaryRoutes } from '../config/routes';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
}

function NavButton({
  active,
  badge,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  badge?: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="group relative flex justify-center">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={[
          'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-150',
          active
            ? 'border-blue-500 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]'
            : 'border-transparent bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:hover:border-gray-700',
        ].join(' ')}
      >
        <span className="text-lg leading-none">{icon}</span>
        {badge ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
      <div className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 rounded-xl bg-gray-950 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
        {label}
      </div>
    </div>
  );
}

export default function SidebarNav({ currentPage, onNavigate, taskCount }: Props) {
  return (
    <aside className="flex h-full w-[68px] shrink-0 flex-col items-center justify-between border-l border-gray-200 bg-white/50 backdrop-blur-md px-2 py-4 dark:border-gray-800 dark:bg-gray-950/50 z-40 relative">
      <div className="flex w-full flex-col items-center gap-2">
        {primaryRoutes.map(({ page, label, icon, badge }) => (
          <NavButton
            key={page}
            active={currentPage === page}
            badge={badge && page === 'tasks' ? taskCount : undefined}
            icon={icon()}
            label={label}
            onClick={() => onNavigate(page)}
          />
        ))}
      </div>

      <div className="flex w-full flex-col items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        {secondaryRoutes.map(({ page, label, icon }) => (
          <NavButton
            key={page}
            active={currentPage === page}
            icon={icon()}
            label={label}
            onClick={() => onNavigate(page)}
          />
        ))}
      </div>
    </aside>
  );
}
