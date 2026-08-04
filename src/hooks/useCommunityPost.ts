import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createComment,
  loadComments,
  loadPost,
  subscribeToComments,
} from '../services/communityForumService';
import type { CommunityComment, CommunityPost } from '../types/community';

export function useCommunityPost(postId: string) {
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextPost, nextComments] = await Promise.all([loadPost(postId), loadComments(postId)]);
    setPost(nextPost);
    setComments(nextComments);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeToComments(postId, () => void refresh()), [postId, refresh]);

  const comment = useCallback(
    async (body: string) => {
      if (!user) return;
      await createComment(postId, user.id, body);
      await refresh();
    },
    [postId, user, refresh]
  );

  return { post, comments, loading, comment, refresh };
}
