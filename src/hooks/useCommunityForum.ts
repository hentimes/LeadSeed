import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createPost,
  loadCategories,
  loadLikedPostIds,
  loadPosts,
  setLike,
  subscribeToPosts,
} from '../services/communityForumService';
import type {
  CommunityCategory,
  CommunityFeedSort,
  CommunityPost,
  NewCommunityPost,
} from '../types/community';

export function useCommunityForum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<CommunityFeedSort>('recent');
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
    refresh,
  };
}
