import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="text-4xl mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
