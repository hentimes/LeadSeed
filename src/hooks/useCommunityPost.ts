import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createComment,
  editComment,
  loadCommentReactions,
  loadComments,
  loadPost,
  removeComment,
  subscribeToComments,
  toggleCommentReaction,
} from '../services/communityForumService';
import { buildCommentTree } from '../utils/buildCommentTree';
import type {
  CommunityComment,
  CommunityCommentNode,
  CommunityPost,
  CommunityReactionKind,
  CommunityReactionSummary,
} from '../types/community';

export function useCommunityPost(postId: string) {
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [reactions, setReactions] = useState<Map<string, CommunityReactionSummary[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextPost, nextComments] = await Promise.all([loadPost(postId), loadComments(postId)]);
    setPost(nextPost);
    setComments(nextComments);
    setLoading(false);

    // Una sola consulta para las reacciones de todo el hilo, no una por
    // comentario.
    setReactions(await loadCommentReactions(nextComments.map((c) => c.id), user?.id));
  }, [postId, user?.id]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeToComments(postId, () => void refresh()), [postId, refresh]);

  /** El hilo armado. Se recalcula solo cuando cambia la lista plana. */
  const tree: CommunityCommentNode[] = useMemo(() => buildCommentTree(comments), [comments]);

  const comment = useCallback(
    async (body: string, parentId?: string | null) => {
      if (!user) return;
      await createComment(postId, user.id, body, parentId);
      await refresh();
    },
    [postId, user, refresh]
  );

  const edit = useCallback(
    async (commentId: string, body: string) => {
      await editComment(commentId, body);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (commentId: string) => {
      await removeComment(commentId);
      await refresh();
    },
    [refresh]
  );

  /**
   * Una sola reaccion por persona y por comentario: elegir otra reemplaza a la
   * anterior. Mismo criterio que el chat, y ademas lo impone un trigger
   * (migracion 128) para que dos pestañas no puedan dejar dos puestas.
   */
  const react = useCallback(
    async (commentId: string, reaction: CommunityReactionKind) => {
      if (!user) return;

      const actuales = reactions.get(commentId) ?? [];
      const mia = actuales.find((r) => r.reactedByMe);
      const esLaMisma = mia?.reaction === reaction;
      const anterior = esLaMisma ? undefined : mia;

      // Optimista: el chip responde al instante y se revierte si falla.
      const siguiente = actuales
        .map((r) => {
          if (r.reaction === anterior?.reaction) {
            return { ...r, count: Math.max(0, r.count - 1), reactedByMe: false };
          }
          if (r.reaction === reaction) {
            return {
              ...r,
              count: Math.max(0, r.count + (esLaMisma ? -1 : 1)),
              reactedByMe: !esLaMisma,
            };
          }
          return r;
        })
        .concat(
          !esLaMisma && !actuales.some((r) => r.reaction === reaction)
            ? [{ reaction, count: 1, reactedByMe: true }]
            : []
        )
        .filter((r) => r.count > 0);

      setReactions((prev) => new Map(prev).set(commentId, siguiente));

      try {
        if (anterior) await toggleCommentReaction(commentId, user.id, anterior.reaction, false);
        await toggleCommentReaction(commentId, user.id, reaction, !esLaMisma);
      } catch (error) {
        console.error('[community] toggleCommentReaction', error);
        setReactions((prev) => new Map(prev).set(commentId, actuales));
      }
    },
    [reactions, user]
  );

  return {
    post,
    comments,
    tree,
    reactions,
    loading,
    comment,
    edit,
    remove,
    react,
    refresh,
    currentUserId: user?.id,
  };
}
