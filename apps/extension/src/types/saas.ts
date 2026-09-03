export interface Plan {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trial_days: number;
  created_at: string;
}

export interface PlanFeature {
  plan_id: string;
  feature_id: string;
}

export interface Profile {
  id: string;           // UUID del usuario (auth.users)
  email: string;
  plan_id?: string;
  role: 'admin' | 'user';
  full_name?: string;
  avatar_url?: string;
  last_seen_at?: string;
  created_at: string;

  // Comunidad y Gamificación
  bio?: string;
  /** Empresa donde trabaja. Texto libre, ver migracion 115. */
  company?: string;
  show_premium_frame?: boolean;
  is_invisible?: boolean;
  badges?: string[];
  is_helper?: boolean;

  // Billing / Pasarelas de Pago (Mercado Pago, Flow, Stripe)
  gateway_customer_id?: string;
  subscription_id?: string;
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  subscription_end_date?: string;
}

export interface UserFeatureOverride {
  user_id: string;
  feature_id: string;
  expires_at?: string;  // Null = permanente
  created_at: string;
}
