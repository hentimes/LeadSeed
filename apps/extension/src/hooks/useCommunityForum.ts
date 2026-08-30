import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createPost,
  editPost,
  loadCategories,
  loadLikedPostIds,
  loadPosts,
  removePost,
  reportPost as reportPostService,
  setLike,
  subscribeToPosts,
} from '../services/communityForumService';
import type {
  CommunityCategory,
  CommunityFeedSort,
  CommunityPost,
  CommunityPostEdit,
  NewCommunityPost,
} from '../types/community';

export function useCommunityForum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  /*
   * Por defecto, actividad reciente: es el orden de un grupo de Facebook y el
   * unico que mantiene viva una conversacion. Con `recent` -que era el defecto
   * anterior- un hilo con diez respuestas de hoy queda debajo de una
   * publicacion de hace un minuto que no le importa a nadie.
   */
  const [sort, setSort] = useState<CommunityFeedSort>('activity');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadLikedPostIds(user.id).then(setLikedPostIds);
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setPosts(await loadPosts(sort, categoryId));
    setLoading(false);
  }, [sort, categoryId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeToPosts(() => void refresh()), [refresh]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;

      const liked = !likedPostIds.has(postId);

      // Optimista: el contador y el corazon responden sin esperar al servidor.
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, likes_count: Math.max(0, post.likes_count + (liked ? 1 : -1)) }
            : post
        )
      );

      try {
        await setLike(postId, user.id, liked);
      } catch {
        await refresh();
        setLikedPostIds(await loadLikedPostIds(user.id));
      }
    },
    [user, likedPostIds, refresh]
  );

  const publish = useCallback(
    async (post: NewCommunityPost) => {
      if (!user) return;
      await createPost(user.id, post);
      await refresh();
    },
    [user, refresh]
  );

  const edit = useCallback(
    async (postId: string, cambios: CommunityPostEdit) => {
      await editPost(postId, cambios);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (postId: string) => {
      await removePost(postId);
      await refresh();
    },
    [refresh]
  );

  const report = useCallback(
    async (postId: string, reason: string) => {
      if (!user) return;
      await reportPostService(postId, user.id, reason);
    },
    [user]
  );

  return {
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
    refresh,
  };
}
