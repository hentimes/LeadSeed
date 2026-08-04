import { Badge } from '../../design';
import { Icon } from '../../utils/icons';
import LikeButton from './LikeButton';
import type { CommunityCategory, CommunityPost } from '../../types/community';

interface PostCardProps {
  post: CommunityPost;
  category?: CommunityCategory;
  liked: boolean;
  isTrending: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  return new Date(iso).toLocaleDateString();
}

export default function PostCard({
  post,
  category,
  liked,
  isTrending,
  onToggleLike,
  onOpen,
}: PostCardProps) {
  const authorName = post.author?.full_name || 'Usuario';
  const avatar =
    post.author?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=3b82f6&color=fff`;

  return (
    <article
      onClick={onOpen}
      className="cursor-pointer rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={post.author?.show_premium_frame ? 'p-[2px] bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full' : ''}>
          <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        </div>
        <span className="text-xs font-semibold text-ink dark:text-gray-200 truncate">{authorName}</span>
        <span className="text-[11px] text-ink-muted">· {relativeTime(post.created_at)}</span>

        <span className="ml-auto flex items-center gap-1.5">
          {isTrending && <Badge tone="warning">Tendencia</Badge>}
          {category && <Badge tone="primary">{category.name}</Badge>}
        </span>
      </div>

      <h3 className="text-body font-semibold text-ink dark:text-gray-100 mb-1">{post.title}</h3>
      <p className="text-sm text-ink-muted line-clamp-3 whitespace-pre-wrap">{post.body}</p>

      <div className="flex items-center gap-2 mt-3">
        <LikeButton liked={liked} count={post.likes_count} onToggle={onToggleLike} />
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-ink-muted">
          <span className="[&_svg]:!h-4 [&_svg]:!w-4">
            <Icon.Messages />
          </span>
          {post.comments_count}
        </span>
      </div>
    </article>
  );
}
