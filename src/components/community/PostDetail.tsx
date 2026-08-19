import { useState } from 'react';
import { useCommunityPost } from '../../hooks/useCommunityPost';
import { COMMENT_MAX } from '../../services/communityForumService';
import { Badge, Button, EmptyState } from '../../design';
import { Icon } from '../../utils/icons';
import LoadingOverlay from '../LoadingOverlay';
import CommentItem from './CommentItem';
import LikeButton from './LikeButton';
import type { CommunityCategory } from '../../types/community';
import { getErrorMessage } from '../../utils/errorMessage';
import { avatarUrl } from '../../utils/avatar';

interface PostDetailProps {
  postId: string;
  category?: CommunityCategory;
  liked: boolean;
  onToggleLike: () => void;
  onBack: () => void;
}

export default function PostDetail({
  postId,
  category,
  liked,
  onToggleLike,
  onBack,
}: PostDetailProps) {
  const { post, comments, loading, comment } = useCommunityPost(postId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <LoadingOverlay message="Cargando publicación..." />;

  if (!post) {
    return (
      <EmptyState
        icon={<Icon.Warning />}
        title="Publicación no encontrada"
        description="Puede que haya sido eliminada."
        action={<Button onClick={onBack}>Volver</Button>}
      />
    );
  }

  const authorName = post.author?.full_name || 'Usuario';
  const avatar = avatarUrl(authorName, post.author?.avatar_url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      await comment(draft);
      setDraft('');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo comentar.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <Button variant="ghost" onClick={onBack} icon={<Icon.ArrowLeft />} className="self-start">
        Volver
      </Button>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        <article className="rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-sm font-semibold text-ink dark:text-gray-200 truncate">
              {authorName}
            </span>
            <span className="text-[11px] text-ink-muted">
              · {new Date(post.created_at).toLocaleString()}
            </span>
            {category && <Badge tone="primary" className="ml-auto">{category.name}</Badge>}
          </div>

          <h2 className="text-section-title font-semibold text-ink dark:text-gray-100 mb-2">
            {post.title}
          </h2>
          <p className="text-sm text-ink dark:text-gray-200 whitespace-pre-wrap break-words">
            {post.body}
          </p>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line dark:border-gray-700">
            <LikeButton liked={liked} count={post.likes_count} onToggle={onToggleLike} />
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-ink-muted">
              <span className="[&_svg]:!h-4 [&_svg]:!w-4">
                <Icon.Messages />
              </span>
              {post.comments_count}
            </span>
          </div>
        </article>

        <div className="space-y-3">
          <h3 className="text-micro font-bold uppercase tracking-wider text-ink-muted">
            Comentarios ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <p className="text-sm text-ink-muted">Todavía no hay comentarios. Empezá la conversación.</p>
          ) : (
            comments.map((item) => <CommentItem key={item.id} comment={item} />)
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {error && <p className="text-sm text-state-danger">{error}</p>}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={2}
            placeholder="Escribí un comentario..."
            className="flex-1 resize-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft"
          />
          <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
            {sending ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
