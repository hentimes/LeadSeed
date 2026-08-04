import type { CommunityComment } from '../../types/community';

export default function CommentItem({ comment }: { comment: CommunityComment }) {
  const authorName = comment.author?.full_name || 'Usuario';
  const avatar =
    comment.author?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=3b82f6&color=fff`;

  return (
    <div className="flex gap-3">
      <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />

      <div className="flex-1 min-w-0 rounded-xl bg-surface-muted dark:bg-gray-900 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-ink dark:text-gray-200 truncate">
            {authorName}
          </span>
          <span className="text-[10px] text-ink-muted">
            {new Date(comment.created_at).toLocaleString([], {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-ink dark:text-gray-100 whitespace-pre-wrap break-words mt-0.5">
          {comment.body}
        </p>
      </div>
    </div>
  );
}
