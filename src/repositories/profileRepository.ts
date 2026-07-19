import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export async function fetchMyFeatureFlags(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_my_features');

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.filter((item): item is string => typeof item === 'string');
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}
