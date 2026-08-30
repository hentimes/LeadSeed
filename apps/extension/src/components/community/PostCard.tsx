import { Avatar, Badge } from '../../design';
import { Icon } from '../../utils/icons';
import LikeButton from './LikeButton';
import type { CommunityCategory, CommunityPost } from '../../types/community';
import { formatearTiempoRelativo } from '../../utils/date';
import { toPlainBody } from '../../utils/richTextParser';

interface PostCardProps {
  post: CommunityPost;
  category?: CommunityCategory;
  liked: boolean;
  isTrending: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}

/**
 * Una publicacion en el feed.
 *
 * Dos arreglos que no son de gusto:
 *
 * 1. **Jerarquia invertida.** El titulo estaba en `text-body` (13px) y el
 *    cuerpo en `text-sm` (14px, el valor por defecto de Tailwind, que este
 *    proyecto no redefine): el titulo se veia MAS CHICO que el texto. Ahora el
 *    titulo abre la tarjeta y el cuerpo va debajo, mas chico y a dos lineas.
 *
 * 2. **Alcanzable con teclado.** Era un `<article onClick>` sin `tabIndex` ni
 *    `role`, o sea que el feed entero no se podia recorrer sin raton (WCAG 2.2
 *    AA 2.1.1). Ahora abre un `<button>` que envuelve al titulo, que ademas es
 *    lo que un lector de pantalla anuncia como nombre del enlace.
 *
 * El cuerpo se recorta a dos lineas a proposito: con tres, a 14px, cada tarjeta
 * ocupaba media pantalla del panel y el feed dejaba de poder ojearse.
 */
export default function PostCard({
  post,
  category,
  liked,
  isTrending,
  onToggleLike,
  onOpen,
}: PostCardProps) {
  const authorName = post.author?.full_name || 'Usuario';

  return (
    <article className="rounded-lg border border-line bg-surface p-3 shadow-card transition-all hover:border-line-strong hover:shadow-float">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left text-card-title font-semibold text-ink transition-colors hover:text-primary"
        >
          <span className="line-clamp-2">{post.title}</span>
        </button>

        {isTrending && (
          <Badge tone="warning" className="mt-0.5 shrink-0">
            Tendencia
          </Badge>
        )}
      </div>

      {/* Sin marcas: la tarjeta recorta a dos lineas y ahi un "**importante**"
          crudo se lee peor que el texto sin formato. */}
      <p className="mt-1 line-clamp-2 text-meta text-ink-secondary">{toPlainBody(post.body)}</p>

      <div className="mt-2.5 flex items-center gap-2 border-t border-line-soft pt-2">
        <Avatar
          name={authorName}
          src={post.author?.avatar_url}
          size="xs"
          premium={!!post.author?.show_premium_frame}
        />

        <span className="min-w-0 truncate text-micro font-medium text-ink-secondary">
          {authorName}
        </span>

        <span className="shrink-0 text-micro text-ink-muted">
          {/*
            Se muestra la ULTIMA actividad, no la creacion: en un orden por
            actividad, ver "hace 3 semanas" en la primera publicacion de la
            lista se lee como un error. Cuando nadie comento todavia, las dos
            fechas son la misma.
          */}
          · {formatearTiempoRelativo(post.last_activity_at ?? post.created_at)}
          {post.edited_at && <span className="ml-1 italic">· editado</span>}
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-1">
          {category && <Badge tone="neutral">{category.name}</Badge>}

          <LikeButton liked={liked} count={post.likes_count} onToggle={onToggleLike} />

          <button
            type="button"
            onClick={onOpen}
            title="Ver comentarios"
            aria-label={`Ver ${post.comments_count} comentarios`}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <span className="[&_svg]:!h-3.5 [&_svg]:!w-3.5">
              <Icon.Messages />
            </span>
            {post.comments_count}
          </button>
        </span>
      </div>
    </article>
  );
}
