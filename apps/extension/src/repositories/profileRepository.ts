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

/**
 * Sube el avatar del usuario y devuelve su URL publica.
 *
 * La ruta tiene que empezar por el uid: la politica RLS del bucket
 * (migracion 060) acota la escritura al prefijo de carpeta del usuario.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() || 'png';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function updateProfileFields(userId: string, updates: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}
