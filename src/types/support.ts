import type { Profile } from './saas';

export type RequirementType = 'soporte' | 'facturacion' | 'bug' | 'sugerencia' | 'otro';
export type RequirementStatus = 'open' | 'in_progress' | 'closed' | 'claim' | 'archived';
export type RequirementRating = 'up' | 'down';

export interface Requirement {
  id: string;
  ticket_code?: string;
  user_id: string;
  helper_id?: string;
  type: RequirementType;
  content: string;
  status: RequirementStatus;
  rating?: RequirementRating;
  claim_reason?: string;
  bump_count?: number;
  last_bumped_at?: string;
  created_at: string;
  updated_at: string;

  // Relaciones cargadas por Supabase
  user_profile?: Profile;
  helper_profile?: Profile;
}
