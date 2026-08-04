import { Icon } from '../../utils/icons';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
}

export default function LikeButton({ liked, count, onToggle }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={liked}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
        liked
          ? 'bg-primary-soft dark:bg-primary/20 text-primary'
          : 'text-ink-muted hover:bg-surface-muted dark:hover:bg-gray-800'
      }`}
      title={liked ? 'Quitar me gusta' : 'Me gusta'}
    >
      <span className="[&_svg]:!h-4 [&_svg]:!w-4">
        <Icon.ThumbUp />
      </span>
      {count}
    </button>
  );
}
