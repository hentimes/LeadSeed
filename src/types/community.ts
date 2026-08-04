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
  author?: CommunityAuthor;
  /** Solo presente al listar por tendencia. */
  trending_score?: number;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: CommunityAuthor;
}

export type CommunityFeedSort = 'recent' | 'trending';

export interface NewCommunityPost {
  categoryId: string;
  title: string;
  body: string;
}
