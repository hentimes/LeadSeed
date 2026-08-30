import * as repo from '../repositories/communityForumRepository';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityFeedSort,
  CommunityPost,
  CommunityPostEdit,
  CommunityReactionKind,
  CommunityReactionSummary,
  NewCommunityPost,
} from '../types/community';

/** Deben coincidir con los CHECK de la migracion 074. */
export const POST_TITLE_MIN = 3;
export const POST_TITLE_MAX = 140;
export const POST_BODY_MAX = 2000;
export const COMMENT_MAX = 500;

export function loadCategories(): Promise<CommunityCategory[]> {
  return repo.fetchCategories();
}

export function loadPosts(sort: CommunityFeedSort, categoryId?: string): Promise<CommunityPost[]> {
  if (sort === 'trending') return repo.fetchTrendingPosts(categoryId);
  if (sort === 'recent') return repo.fetchRecentPosts(categoryId);
  return repo.fetchPostsByActivity(categoryId);
}

/**
 * Guarda los cambios de una publicacion.
 *
 * Reusa `validatePost`: las reglas de largo del titulo y del cuerpo son las
 * mismas al crear y al editar, y tenerlas en dos sitios es como se separan.
 */
export function editPost(postId: string, edit: CommunityPostEdit): Promise<CommunityPost | null> {
  const error = validatePost({ ...edit, title: edit.title, body: edit.body });
  if (error) throw new Error(error);

  return repo.updatePost(postId, {
    title: edit.title.trim(),
    body: edit.body.trim(),
    categoryId: edit.categoryId,
  });
}

export function removePost(postId: string): Promise<void> {
  return repo.deletePost(postId);
}

/** Maximo del motivo. Debe coincidir con el CHECK de la migracion 126. */
export const REPORT_REASON_MAX = 200;

export function reportPost(postId: string, reporterId: string, reason: string): Promise<void> {
  return repo.reportPost(postId, reporterId, reason.trim().slice(0, REPORT_REASON_MAX));
}

export function loadPost(postId: string): Promise<CommunityPost | null> {
  return repo.fetchPostById(postId);
}

export function searchPosts(term: string): Promise<CommunityPost[]> {
  return repo.searchPostsByTitle(term);
}

export function validatePost({ title, body, categoryId }: NewCommunityPost): string | null {
  if (!categoryId) return 'Elegí una categoría.';

  const trimmedTitle = title.trim();
  if (trimmedTitle.length < POST_TITLE_MIN) {
    return `El título necesita al menos ${POST_TITLE_MIN} caracteres.`;
  }
  if (trimmedTitle.length > POST_TITLE_MAX) {
    return `El título no puede superar los ${POST_TITLE_MAX} caracteres.`;
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) return 'Escribí el contenido de la publicación.';
  if (trimmedBody.length > POST_BODY_MAX) {
    return `El contenido no puede superar los ${POST_BODY_MAX} caracteres.`;
  }

  return null;
}

export function createPost(authorId: string, post: NewCommunityPost): Promise<CommunityPost | null> {
  const error = validatePost(post);
  if (error) throw new Error(error);

  return repo.insertPost(authorId, {
    categoryId: post.categoryId,
    title: post.title.trim(),
    body: post.body.trim(),
  });
}

export function loadComments(postId: string): Promise<CommunityComment[]> {
  return repo.fetchComments(postId);
}

/** Las mismas reglas al crear y al editar; tenerlas dos veces es como se separan. */
function validarComentario(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('El comentario está vacío.');
  if (trimmed.length > COMMENT_MAX) {
    throw new Error(`El comentario no puede superar los ${COMMENT_MAX} caracteres.`);
  }
  return trimmed;
}

export function createComment(
  postId: string,
  authorId: string,
  body: string,
  parentId?: string | null
): Promise<CommunityComment | null> {
  return repo.insertComment(postId, authorId, validarComentario(body), parentId);
}

export function editComment(commentId: string, body: string): Promise<CommunityComment | null> {
  return repo.updateComment(commentId, validarComentario(body));
}

export function removeComment(commentId: string): Promise<void> {
  return repo.softDeleteComment(commentId);
}

export function loadCommentReactions(
  commentIds: string[],
  userId?: string
): Promise<Map<string, CommunityReactionSummary[]>> {
  return repo.fetchCommentReactions(commentIds, userId);
}

export function toggleCommentReaction(
  commentId: string,
  userId: string,
  reaction: CommunityReactionKind,
  reacted: boolean
): Promise<void> {
  return repo.toggleCommentReaction(commentId, userId, reaction, reacted);
}

export function loadLikedPostIds(userId: string): Promise<Set<string>> {
  return repo.fetchLikedPostIds(userId).then((ids) => new Set(ids));
}

export function setLike(postId: string, userId: string, liked: boolean): Promise<void> {
  return liked ? repo.addLike(postId, userId) : repo.removeLike(postId, userId);
}

export const subscribeToPosts = repo.subscribeToPostInserts;
export const subscribeToComments = repo.subscribeToCommentInserts;
