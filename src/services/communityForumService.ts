import * as repo from '../repositories/communityForumRepository';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityFeedSort,
  CommunityPost,
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
  return sort === 'trending'
    ? repo.fetchTrendingPosts(categoryId)
    : repo.fetchRecentPosts(categoryId);
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

export function createComment(
  postId: string,
  authorId: string,
  body: string
): Promise<CommunityComment | null> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('El comentario está vacío.');
  if (trimmed.length > COMMENT_MAX) {
    throw new Error(`El comentario no puede superar los ${COMMENT_MAX} caracteres.`);
  }

  return repo.insertComment(postId, authorId, trimmed);
}

export function loadLikedPostIds(userId: string): Promise<Set<string>> {
  return repo.fetchLikedPostIds(userId).then((ids) => new Set(ids));
}

export function setLike(postId: string, userId: string, liked: boolean): Promise<void> {
  return liked ? repo.addLike(postId, userId) : repo.removeLike(postId, userId);
}

export const subscribeToPosts = repo.subscribeToPostInserts;
export const subscribeToComments = repo.subscribeToCommentInserts;
