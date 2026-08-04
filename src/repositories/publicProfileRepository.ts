import { supabase } from '../lib/supabaseClient';

export interface PublicProfile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  badges?: string[] | null;
  show_premium_frame?: boolean | null;
  is_helper?: boolean | null;
  role?: string | null;
  last_seen_at?: string | null;
}

/** profiles_public es la vista segura: no expone email ni datos de facturacion. */
export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('id, full_name, avatar_url, bio, badges, show_premium_frame, is_helper, role, last_seen_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicProfile;
}
