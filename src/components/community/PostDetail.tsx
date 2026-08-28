import { useState } from 'react';
import { useCommunityPost } from '../../hooks/useCommunityPost';
import { COMMENT_MAX } from '../../services/communityForumService';
import { Avatar, Badge, Button, EmptyState, IconButton, Skeleton } from '../../design';
import { Icon } from '../../utils/icons';
import CommentItem from './CommentItem';
import LikeButton from './LikeButton';
import PostBody from './PostBody';
import PostActionsMenu from './PostActionsMenu';
import type { CommunityCategory } from '../../types/community';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatearTiempoRelativo } from '../../utils/date';
import { contarComentarios } from '../../utils/buildCommentTree';

interface PostDetailProps {
  postId: string;
  category?: CommunityCategory;
  liked: boolean;
  /** Quien mira, para decidir si puede editar o eliminar. */
  currentUserId?: string;
  isStaff?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onReport?: (reason: string) => Promise<void>;
  /**
   * Devuelve la promesa del guardado a proposito: el detalle necesita saber
   * cuando termino para releer el post. Sin eso, el corazon se encendia pero el
   * contador de al lado se quedaba con el numero viejo, porque el feed y el
   * detalle leen `likes_count` de dos fuentes distintas.
   */
  onToggleLike: () => void | Promise<void>;
  onBack: () => void;
}

/** Lo que se ve mientras carga, en vez del spinner a pantalla completa. */
function PostDetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando publicación" className="space-y-4">
      <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
        <Skeleton width="85%" height="14px" />
        <Skeleton width="60%" height="14px" />
        <Skeleton width="100%" height="10px" className="mt-3" />
        <Skeleton width="94%" height="10px" />
        <Skeleton width="70%" height="10px" />
      </div>

      {[0, 1].map((i) => (
        <div key={i} className="flex gap-2">
          <Skeleton shape="circle" width="24px" height="24px" />
          <Skeleton shape="block" width="80%" height="42px" />
        </div>
      ))}
    </div>
  );
}

export default function PostDetail({
  postId,
  category,
  liked,
  currentUserId,
  isStaff = false,
  onEdit,
  onDelete,
  onReport,
  onToggleLike,
  onBack,
}: PostDetailProps) {
  const {
    post,
    tree,
    reactions,
    loading,
    comment,
    edit: editComment,
    remove: removeComment,
    react,
    refresh,
    currentUserId: autorActual,
  } = useCommunityPost(postId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleToggleLike = async () => {
    await onToggleLike();
    await refresh();
  };

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

  const cabecera = (
    <div className="flex items-center gap-2">
      <IconButton icon={<Icon.ArrowLeft />} label="Volver al feed" onClick={onBack} size="sm" />
      <span className="text-meta font-semibold text-ink-secondary">Volver al feed</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3">
        {cabecera}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <PostDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-full flex-col gap-3">
        {cabecera}
        <EmptyState
          icon={<Icon.Warning />}
          title="No encontramos la publicación"
          description="Puede que la hayan eliminado."
          action={<Button onClick={onBack}>Volver al feed</Button>}
        />
      </div>
    );
  }

  const authorName = post.author?.full_name || 'Usuario';

  return (
    <div className="flex h-full flex-col gap-3">
      {cabecera}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <article className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 text-section-title font-semibold text-ink">
              {post.title}
            </h2>

            {category && (
              <Badge tone="primary" className="mt-0.5 shrink-0">
                {category.name}
              </Badge>
            )}

            {/*
              Quien puede hacer que lo decide la base (politicas de la 074);
              aca solo se esconde lo que igual seria rechazado, para no ofrecer
              un boton que falla al tocarlo.
            */}
            <PostActionsMenu
              canEdit={!!onEdit && post.author_id === currentUserId}
              canDelete={!!onDelete && (post.author_id === currentUserId || isStaff)}
              canReport={!!onReport && post.author_id !== currentUserId}
              onEdit={() => onEdit?.()}
              onDelete={async () => onDelete?.()}
              onReport={async (reason) => onReport?.(reason)}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Avatar
              name={authorName}
              src={post.author?.avatar_url}
              size="sm"
              premium={!!post.author?.show_premium_frame}
            />
            <span className="min-w-0 truncate text-micro font-medium text-ink-secondary">
              {authorName}
            </span>
            <span className="shrink-0 text-micro text-ink-muted">
              · {formatearTiempoRelativo(post.created_at)}
              {post.edited_at && <span className="ml-1 italic">· editado</span>}
            </span>
          </div>

          {/* El detalle es el unico sitio donde el cuerpo se dibuja con su
              formato. La tarjeta del feed lo sigue mostrando como texto
              recortado a dos lineas: ahi el formato no aporta y los
              encabezados romperian la altura pareja de las tarjetas. */}
          <PostBody body={post.body} className="mt-3" />

          <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-2">
            <LikeButton
              liked={liked}
              count={post.likes_count}
              onToggle={() => void handleToggleLike()}
            />
            <span className="flex items-center gap-1 px-2 py-0.5 text-micro font-semibold text-ink-muted">
              <span className="[&_svg]:!h-3.5 [&_svg]:!w-3.5">
                <Icon.Messages />
              </span>
              {post.comments_count}
            </span>
          </div>
        </article>

        <div className="space-y-2.5">
          <h3 className="text-micro font-bold uppercase tracking-wider text-ink-muted">
            {/* El hilo entero, no solo las raices: decir "3 comentarios"
                cuando hay tres raices y ocho respuestas es mentira. */}
            Comentarios ({contarComentarios(tree)})
          </h3>

          {tree.length === 0 ? (
            <p className="text-meta text-ink-muted">
              Todavía no hay comentarios. Empezá vos la conversación.
            </p>
          ) : (
            <ul className="space-y-3">
              {tree.map((nodo) => (
                <CommentItem
                  key={nodo.id}
                  node={nodo}
                  currentUserId={autorActual}
                  isStaff={isStaff}
                  reactions={reactions}
                  onReply={(parentId, body) => comment(body, parentId)}
                  onEdit={editComment}
                  onDelete={removeComment}
                  onReact={react}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-meta font-medium text-state-danger">
            {error}
          </p>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={2}
            placeholder="Escribí un comentario…"
            aria-label="Comentario"
            className="flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-focus"
          />
          <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
            {sending ? 'Enviando…' : 'Comentar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
