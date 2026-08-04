import type { CommunityCategory, CommunityFeedSort } from '../../types/community';

interface CategoryFilterBarProps {
  categories: CommunityCategory[];
  activeCategoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
  sort: CommunityFeedSort;
  onSortChange: (sort: CommunityFeedSort) => void;
}

export default function CategoryFilterBar({
  categories,
  activeCategoryId,
  onCategoryChange,
  sort,
  onSortChange,
}: CategoryFilterBarProps) {
  const chip = (isActive: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'bg-surface-muted dark:bg-gray-800 text-ink-muted hover:text-ink dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 self-start rounded-full bg-surface-muted dark:bg-gray-800 p-1">
        <button
          type="button"
          onClick={() => onSortChange('recent')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            sort === 'recent' ? 'bg-white dark:bg-gray-900 text-ink dark:text-gray-100 shadow-sm' : 'text-ink-muted'
          }`}
        >
          Recientes
        </button>
        <button
          type="button"
          onClick={() => onSortChange('trending')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            sort === 'trending' ? 'bg-white dark:bg-gray-900 text-ink dark:text-gray-100 shadow-sm' : 'text-ink-muted'
          }`}
        >
          Tendencia
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => onCategoryChange(undefined)} className={chip(!activeCategoryId)}>
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={chip(activeCategoryId === category.id)}
            title={category.description ?? undefined}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
