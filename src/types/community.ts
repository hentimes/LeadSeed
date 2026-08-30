export interface CommunityAuthor {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  show_premium_frame?: boolean | null;
}

export interface CommunityCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  category_id: string;
  title: string;
  body: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  /**
   * Ultima vez que paso algo: se creo, o le comentaron. Es la clave del orden
   * por actividad, que es el que usa un grupo de Facebook por defecto. Ver la
   * migracion 126.
   */
  last_activity_at?: string;
  /** Cuando se edito por ultima vez, o ausente si nunca. Lo pone un trigger. */
  edited_at?: string | null;
  author?: CommunityAuthor;
  /** Solo presente al listar por tendencia. */
  trending_score?: number;
}

/** Lo que se puede cambiar de una publicacion ya creada. */
export interface CommunityPostEdit {
  title: string;
  body: string;
  categoryId: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  /** Comentario al que responde, o null si cuelga directo de la publicacion. */
  parent_id?: string | null;
  /** 0 = raiz. Lo calcula un trigger y esta topado en 2 (migracion 121). */
  depth?: number;
  /** Borrado suave: el comentario se conserva para no romper el hilo. */
  deleted_at?: string | null;
  edited_at?: string | null;
  author?: CommunityAuthor;
}

/** Un comentario con sus respuestas colgando. */
export interface CommunityCommentNode extends CommunityComment {
  children: CommunityCommentNode[];
}

/**
 * Las tres reacciones posibles. Se guarda un identificador estable y no el
 * caracter; el motivo esta en `CHAT_REACTIONS`, que es la misma decision para
 * el chat. Lo que se DIBUJA son iconos del proyecto.
 */
export const COMMUNITY_REACTIONS = ['like', 'dislike', 'love'] as const;

export type CommunityReactionKind = (typeof COMMUNITY_REACTIONS)[number];

export interface CommunityReactionSummary {
  reaction: CommunityReactionKind;
  count: number;
  reactedByMe: boolean;
}

/**
 * Los tres ordenes del feed, calcados de los de un grupo de Facebook:
 *
 * - `activity`  "Actividad reciente": cada comentario devuelve la publicacion
 *               arriba. Es el que se usa por defecto, porque es el que mantiene
 *               vivas las conversaciones en vez de premiar solo lo recien
 *               escrito.
 * - `recent`    "Publicaciones recientes": por fecha de creacion.
 * - `trending`  "Mas relevantes": interaccion con decaimiento por antiguedad.
 */
export type CommunityFeedSort = 'activity' | 'recent' | 'trending';

export interface NewCommunityPost {
  categoryId: string;
  title: string;
  body: string;
}
