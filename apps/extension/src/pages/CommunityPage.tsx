import { useEffect, useMemo, useRef, useState } from 'react';
import { useCommunityForum } from '../hooks/useCommunityForum';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineDirectory, displayName, avatarFor } from '../hooks/useOnlineDirectory';
import { AvatarStack, Button, EmptyState, Modal, Skeleton } from '../design';
import { Icon } from '../utils/icons';
import CategoryTabs from '../components/community/CategoryTabs';
import FeedSortMenu from '../components/community/FeedSortMenu';
import PostCard from '../components/community/PostCard';
import PostComposer from '../components/community/PostComposer';
import PostDetail from '../components/community/PostDetail';

/** Cuantas publicaciones del tope se marcan como tendencia. */
const TRENDING_HIGHLIGHT_COUNT = 3;

/** Cuantos avatares entran en la tira de conectados antes del "+N". */
const AVATARES_EN_LA_TIRA = 5;

interface CommunityPageProps {
  /** Publicacion a abrir al entrar, por ejemplo desde una mencion del chat. */
  initialPostId?: string | null;
  onInitialPostConsumed?: () => void;
}

/** Tres tarjetas fantasma mientras carga el feed. */
function FeedSkeleton() {
  return (
    <div role="status" aria-label="Cargando publicaciones" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border border-line bg-surface p-3">
          <Skeleton width="78%" height="13px" />
          <Skeleton width="100%" height="10px" />
          <Skeleton width="52%" height="10px" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton shape="circle" width="20px" height="20px" />
            <Skeleton width="88px" height="9px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityPage({
  initialPostId,
  onInitialPostConsumed,
}: CommunityPageProps) {
  const {
    categories,
    posts,
    likedPostIds,
    sort,
    categoryId,
    loading,
    setSort,
    setCategoryId,
    toggleLike,
    publish,
    edit,
    remove,
    report,
  } = useCommunityForum();

  const { user, profile } = useAuth();
  const isStaff = profile?.role === 'admin' || !!profile?.is_helper;

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  /** Publicacion que se esta editando, si hay alguna. */
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(initialPostId ?? null);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const { users: onlineUsers, count: onlineCount } = useOnlineDirectory();

  const feedRef = useRef<HTMLDivElement>(null);
  /** Donde estaba el feed antes de abrir una publicacion, para volver ahi. */
  const scrollGuardado = useRef(0);

  /*
   * `useState(initialPostId)` solo lee la prop al montar. Si la pagina ya
   * estaba montada, una segunda mencion del chat no abria nada: el estado
   * inicial ya se habia consumido. Esto la sincroniza cada vez que llega una
   * nueva.
   */
  useEffect(() => {
    if (initialPostId) setOpenPostId(initialPostId);
  }, [initialPostId]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const trendingIds = useMemo(() => {
    const ranked = [...posts]
      .filter((post) => post.likes_count + post.comments_count > 0)
      .sort(
        (a, b) =>
          (b.trending_score ?? b.likes_count * 2 + b.comments_count * 3) -
          (a.trending_score ?? a.likes_count * 2 + a.comments_count * 3)
      )
      .slice(0, TRENDING_HIGHLIGHT_COUNT);

    return new Set(ranked.map((post) => post.id));
  }, [posts]);

  const openDetail = (postId: string) => {
    scrollGuardado.current = feedRef.current?.scrollTop ?? 0;
    setOpenPostId(postId);
  };

  const closeDetail = () => {
    setOpenPostId(null);
    onInitialPostConsumed?.();
    // El feed se remonta al cerrar el detalle: hay que esperar a que exista
    // otra vez para devolverle la posicion.
    requestAnimationFrame(() => {
      if (feedRef.current) feedRef.current.scrollTop = scrollGuardado.current;
    });
  };

  const openPost = openPostId ? posts.find((post) => post.id === openPostId) : undefined;

  const enEdicion = editandoId ? posts.find((post) => post.id === editandoId) : undefined;

  if (openPostId) {
    return (
      <>
        <PostDetail
          postId={openPostId}
          category={openPost ? categoriesById.get(openPost.category_id) : undefined}
          liked={likedPostIds.has(openPostId)}
          currentUserId={user?.id}
          isStaff={isStaff}
          onEdit={() => setEditandoId(openPostId)}
          onDelete={async () => {
            await remove(openPostId);
            // Ya no existe: volver al feed es lo unico coherente.
            closeDetail();
          }}
          onReport={(reason) => report(openPostId, reason)}
          onToggleLike={() => toggleLike(openPostId)}
          onBack={closeDetail}
        />

        {enEdicion && (
          <PostComposer
            categories={categories}
            editing={enEdicion}
            onClose={() => setEditandoId(null)}
            onPublish={async (cambios) => {
              await edit(enEdicion.id, cambios);
              setEditandoId(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-2.5">
      <CategoryTabs
        categories={categories}
        activeCategoryId={categoryId}
        onCategoryChange={setCategoryId}
      />

      {/*
        Segunda fila: quien esta conectado a la izquierda, orden y publicar a la
        derecha.

        El orden y el boton estaban arriba, peleando el ancho con las
        categorias, y por eso estas se envolvian a dos lineas. Aca no compiten
        con nada: esta fila ya existia para la tira de conectados y tenia todo
        el lado derecho vacio.
      */}
      <div className="flex min-h-[28px] items-center gap-2">
        {onlineCount > 0 && (
          <button
            type="button"
            onClick={() => setShowOnlineList(true)}
            aria-label={`Ver las ${onlineCount} personas conectadas`}
            className="flex min-w-0 items-center gap-2 rounded-full py-0.5 pr-2 transition-colors hover:bg-surface-hover"
          >
            <AvatarStack
              max={AVATARES_EN_LA_TIRA}
              people={onlineUsers.map((user) => ({
                id: user.id,
                name: displayName(user),
                avatarUrl: avatarFor(user),
              }))}
            >
              <span className="flex items-center gap-1 text-micro text-ink-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-state-success" />
                {onlineCount} en línea
              </span>
            </AvatarStack>
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <FeedSortMenu value={sort} onChange={setSort} />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsComposerOpen(true)}
            icon={<Icon.Plus />}
            title="Publicar"
            aria-label="Publicar"
          >
            <span className="hidden panel-lg:inline">Publicar</span>
          </Button>
        </div>
      </div>

      {/*
        Al cambiar de categoria el feed se recarga sin que nada lo anuncie: para
        quien usa lector de pantalla, tocar una pestana no produce ningun
        cambio audible. Esta linea invisible lo dice.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {categoryId
          ? `Mostrando ${categoriesById.get(categoryId)?.name ?? 'la categoría'}, ${posts.length} publicaciones`
          : `Mostrando todas las publicaciones, ${posts.length}`}
      </p>

      <div ref={feedRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Icon.Messages />}
            title="Todavía no hay publicaciones"
            description="Abrí vos la primera conversación."
            action={
              <Button variant="primary" onClick={() => setIsComposerOpen(true)}>
                Crear publicación
              </Button>
            }
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              category={categoriesById.get(post.category_id)}
              liked={likedPostIds.has(post.id)}
              isTrending={trendingIds.has(post.id)}
              onToggleLike={() => void toggleLike(post.id)}
              onOpen={() => openDetail(post.id)}
            />
          ))
        )}
      </div>

      {showOnlineList && (
        <Modal onClose={() => setShowOnlineList(false)} maxWidth="360px" label="Personas conectadas">
          <div className="flex max-h-[70vh] flex-col">
            <h2 className="border-b border-line px-4 py-3 text-section-title font-semibold text-ink">
              En línea ({onlineCount})
            </h2>

            <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2.5 rounded-lg p-1.5">
                  <img
                    src={avatarFor(user)}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                  <p className="min-w-0 truncate text-meta font-medium text-ink">
                    {displayName(user)}
                  </p>
                  <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-state-success" />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {isComposerOpen && (
        <PostComposer
          categories={categories}
          defaultCategoryId={categoryId}
          onClose={() => setIsComposerOpen(false)}
          onPublish={publish}
        />
      )}
    </div>
  );
}
