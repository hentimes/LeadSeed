import { supabase } from '../lib/supabaseClient';
import { uniqueChannelName } from '../utils/realtimeChannel';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  CommunityReactionEmoji,
  CommunityReactionSummary,
  NewCommunityPost,
} from '../types/community';

// author_profile es una relacion calculada (migracion 074), no una FK: se
// embebe por el nombre de la funcion, igual que sender_profile en soporte.
const AUTHOR_SELECT = 'author:author_profile(id, full_name, avatar_url, show_premium_frame)';

const POST_SELECT = `id, author_id, category_id, title, body, likes_count, comments_count, created_at, last_activity_at, edited_at, ${AUTHOR_SELECT}`;

const COMMENT_SELECT = `id, post_id, author_id, body, created_at, parent_id, depth, deleted_at, edited_at, ${AUTHOR_SELECT}`;

export const POSTS_PAGE_SIZE = 20;

export async function fetchCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from('community_categories')
    .select('id, slug, name, description, icon, sort_order')
    .order('sort_order');

  if (error || !data) return [];
  return data as CommunityCategory[];
}

/**
 * Feed por actividad reciente: cada comentario devuelve la publicacion arriba.
 *
 * Es el orden por defecto, el mismo que usa un grupo de Facebook. Se apoya en
 * `last_activity_at`, una columna que mantiene un trigger (migracion 126), y no
 * en el maximo de los comentarios calculado al vuelo: eso obligaria a agregar
 * sobre toda la tabla de comentarios en cada carga y no se podria indexar.
 */
export async function fetchPostsByActivity(categoryId?: string): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select(POST_SELECT)
    .order('last_activity_at', { ascending: false })
    .limit(POSTS_PAGE_SIZE);

  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as CommunityPost[];
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

/**
 * Cambia titulo, cuerpo y categoria de una publicacion.
 *
 * Quien puede hacerlo lo decide la politica "Authors or staff update community
 * posts" de la migracion 074, no esta funcion: si alguien intenta editar lo
 * ajeno, la base devuelve cero filas y aca se ve como un fallo.
 *
 * `edited_at` NO se manda desde aca a proposito: lo pone un trigger del
 * servidor. Si dependiera del cliente, bastaria con no mandarlo para editar sin
 * dejar rastro.
 */
export async function updatePost(
  postId: string,
  edit: { title: string; body: string; categoryId: string }
): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .update({ title: edit.title, body: edit.body, category_id: edit.categoryId })
    .eq('id', postId)
    .select(POST_SELECT)
    .single();

  if (error) throw error;
  return (data as unknown as CommunityPost) ?? null;
}

/** Borra la publicacion. Los comentarios caen con ella por ON DELETE CASCADE. */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

/**
 * Denuncia una publicacion.
 *
 * El codigo `23505` es "clave duplicada", o sea que esta persona ya la habia
 * denunciado. No es un error que haya que mostrar: el estado final es el que
 * queria: queda denunciada una vez.
 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('community_post_reports')
    .insert({ post_id: postId, reporter_id: reporterId, reason: reason || null });

  if (error && error.code !== '23505') throw error;
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
  body: string,
  /** Comentario al que responde. Sin esto, cuelga de la publicacion. */
  parentId?: string | null
): Promise<CommunityComment | null> {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, author_id: authorId, body, parent_id: parentId ?? null })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;
  return (data as unknown as CommunityComment) ?? null;
}

/**
 * Cambia el texto de un comentario.
 *
 * Solo su autor: lo impone la politica "Authors update own community comments"
 * de la migracion 127. A diferencia de las publicaciones, el staff NO puede
 * editar comentarios ajenos -reescribir lo que dijo otra persona en su nombre
 * es distinto de borrarlo-; para moderar esta el borrado suave.
 *
 * `edited_at` lo pone un trigger, no esta funcion.
 */
export async function updateComment(
  commentId: string,
  body: string
): Promise<CommunityComment | null> {
  const { data, error } = await supabase
    .from('community_comments')
    .update({ body })
    .eq('id', commentId)
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;
  return (data as unknown as CommunityComment) ?? null;
}

/**
 * Borrado suave: el comentario se queda con un aviso en vez de desaparecer.
 *
 * Va por RPC y no por un UPDATE directo porque la funcion comprueba permisos
 * adentro (autor o staff) y porque borrar de verdad un comentario con
 * respuestas se llevaria el hilo entero por delante. Ver la migracion 121.
 */
export async function softDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('community_soft_delete_comment', {
    p_comment_id: commentId,
  });

  if (error) throw error;
}

interface FilaDeResumenDeComentario {
  comment_id: string;
  emoji: CommunityReactionEmoji;
  count: number;
  user_ids: string[];
}

/**
 * Reacciones de un lote de comentarios, agrupadas por comentario.
 *
 * UNA consulta para todo el hilo, no una por comentario. El agregado lo hace la
 * vista `community_comment_reaction_summary` (migracion 128).
 */
export async function fetchCommentReactions(
  commentIds: string[],
  currentUserId?: string
): Promise<Map<string, CommunityReactionSummary[]>> {
  const porComentario = new Map<string, CommunityReactionSummary[]>();
  if (commentIds.length === 0) return porComentario;

  const { data, error } = await supabase
    .from('community_comment_reaction_summary')
    .select('comment_id, emoji, count, user_ids')
    .in('comment_id', commentIds);

  if (error || !data) {
    // Sin la migracion 128 esto falla, y es una degradacion aceptable: los
    // comentarios se siguen leyendo, simplemente sin reacciones.
    if (error) console.error('[community] fetchCommentReactions', error);
    return porComentario;
  }

  for (const fila of data as unknown as FilaDeResumenDeComentario[]) {
    const lista = porComentario.get(fila.comment_id) ?? [];
    lista.push({
      emoji: fila.emoji,
      count: fila.count,
      reactedByMe: !!currentUserId && fila.user_ids.includes(currentUserId),
    });
    porComentario.set(fila.comment_id, lista);
  }

  return porComentario;
}

/**
 * Pone o quita una reaccion a un comentario.
 *
 * El codigo `23505` es "clave duplicada": la reaccion ya estaba. No es un error
 * que haya que mostrar, el estado final es el que se queria.
 */
export async function toggleCommentReaction(
  commentId: string,
  userId: string,
  emoji: CommunityReactionEmoji,
  reacted: boolean
): Promise<void> {
  if (reacted) {
    const { error } = await supabase
      .from('community_comment_reactions')
      .insert({ comment_id: commentId, user_id: userId, emoji });

    if (error && error.code !== '23505') throw error;
    return;
  }

  const { error } = await supabase
    .from('community_comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) throw error;
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
