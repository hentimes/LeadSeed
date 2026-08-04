import { useMemo, useState } from 'react';
import { useCommunityForum } from '../hooks/useCommunityForum';
import { useOnlineDirectory, displayName, avatarFor } from '../hooks/useOnlineDirectory';
import { Button, EmptyState } from '../design';
import { Icon } from '../utils/icons';
import LoadingOverlay from '../components/LoadingOverlay';
import CategoryFilterBar from '../components/community/CategoryFilterBar';
import PostCard from '../components/community/PostCard';
import PostComposer from '../components/community/PostComposer';
import PostDetail from '../components/community/PostDetail';

/** Cuantas publicaciones del tope se marcan como tendencia. */
const TRENDING_HIGHLIGHT_COUNT = 3;

interface CommunityPageProps {
  /** Publicacion a abrir al entrar, por ejemplo desde una mencion del chat. */
  initialPostId?: string | null;
  onInitialPostConsumed?: () => void;
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
  } = useCommunityForum();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(initialPostId ?? null);
  const { users: onlineUsers, count: onlineCount } = useOnlineDirectory();

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

  const closeDetail = () => {
    setOpenPostId(null);
    onInitialPostConsumed?.();
  };

  if (loading) return <LoadingOverlay message="Cargando comunidad..." />;

  const openPost = openPostId ? posts.find((post) => post.id === openPostId) : undefined;

  return (
    <div className="flex h-full gap-4">
      <section className="flex-1 min-w-0 flex flex-col gap-3">
        {openPostId ? (
          <PostDetail
            postId={openPostId}
            category={openPost ? categoriesById.get(openPost.category_id) : undefined}
            liked={likedPostIds.has(openPostId)}
            onToggleLike={() => void toggleLike(openPostId)}
            onBack={closeDetail}
          />
        ) : (
          <>
        <div className="flex items-start justify-between gap-3">
          <CategoryFilterBar
            categories={categories}
            activeCategoryId={categoryId}
            onCategoryChange={setCategoryId}
            sort={sort}
            onSortChange={setSort}
          />
          <Button variant="primary" onClick={() => setIsComposerOpen(true)} icon={<Icon.Plus />}>
            Publicar
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {posts.length === 0 ? (
            <EmptyState
              icon={<Icon.Messages />}
              title="Todavía no hay publicaciones"
              description="Sé la primera persona en abrir una conversación."
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
                onOpen={() => setOpenPostId(post.id)}
              />
            ))
          )}
        </div>
          </>
        )}
      </section>

      <aside className="w-64 flex-shrink-0 rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 hidden md:flex flex-col overflow-hidden">
        <div className="p-4 border-b border-line dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-ink dark:text-gray-100">En línea</h3>
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {onlineCount}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted dark:hover:bg-gray-900 transition-colors">
              <div className="relative flex-shrink-0">
                <img src={avatarFor(user)} alt="" className="w-9 h-9 rounded-full object-cover" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full" />
              </div>
              <p className="text-sm font-medium text-ink dark:text-gray-100 truncate">
                {displayName(user)}
              </p>
            </div>
          ))}
        </div>
      </aside>

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
