import { supabase } from '../lib/supabaseClient';
import { uniqueChannelName } from '../utils/realtimeChannel';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  NewCommunityPost,
} from '../types/community';

// author_profile es una relacion calculada (migracion 074), no una FK: se
// embebe por el nombre de la funcion, igual que sender_profile en soporte.
const AUTHOR_SELECT = 'author:author_profile(id, full_name, avatar_url, show_premium_frame)';

const POST_SELECT = `id, author_id, category_id, title, body, likes_count, comments_count, created_at, ${AUTHOR_SELECT}`;

const COMMENT_SELECT = `id, post_id, author_id, body, created_at, ${AUTHOR_SELECT}`;

export const POSTS_PAGE_SIZE = 20;

export async function fetchCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from('community_categories')
    .select('id, slug, name, description, icon, sort_order')
    .order('sort_order');

  if (error || !data) return [];
  return data as CommunityCategory[];
}

export async function fetchRecentPosts(categoryId?: string): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(POSTS_PAGE_SIZE);

  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as CommunityPost[];
}

export async function fetchTrendingPosts(categoryId?: string): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts_trending')
    .select(`${POST_SELECT}, trending_score`)
    .order('trending_score', { ascending: false })
    .limit(POSTS_PAGE_SIZE);

  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as CommunityPost[];
}

export async function fetchPostById(postId: string): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single();

  if (error || !data) return null;
  return data as unknown as CommunityPost;
}

export async function searchPostsByTitle(term: string, limit = 5): Promise<CommunityPost[]> {
  const cleaned = term.trim();
  if (!cleaned) return [];

  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .ilike('title', `%${cleaned}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as CommunityPost[];
}

export async function insertPost(
  authorId: string,
  post: NewCommunityPost
): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: authorId,
      category_id: post.categoryId,
      title: post.title,
      body: post.body,
    })
    .select(POST_SELECT)
    .single();

  if (error) throw error;
  return (data as unknown as CommunityPost) ?? null;
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at');

  if (error || !data) return [];
  return data as unknown as CommunityComment[];
}

export async function insertComment(
  postId: string,
  authorId: string,
  body: string
): Promise<CommunityComment | null> {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, author_id: authorId, body })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;
  return (data as unknown as CommunityComment) ?? null;
}

export async function fetchLikedPostIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data.map((row) => (row as { post_id: string }).post_id);
}

export async function addLike(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_post_likes')
    .insert({ post_id: postId, user_id: userId });

  // Un like duplicado (doble click, dos pestanas) no es un fallo real.
  if (error && error.code !== '23505') throw error;
}

export async function removeLike(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export function subscribeToPostInserts(onInsert: (postId: string) => void): () => void {
  const channel = supabase
    .channel(uniqueChannelName('community-posts'))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_posts' },
      (payload) => onInsert((payload.new as { id: string }).id)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToCommentInserts(
  postId: string,
  onInsert: (commentId: string) => void
): () => void {
  const channel = supabase
    .channel(`community-comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'community_comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => onInsert((payload.new as { id: string }).id)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
