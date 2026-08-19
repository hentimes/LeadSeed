import {
  fetchMyFeatureFlags,
  fetchProfileById,
  updateProfileFields,
  uploadAvatar as uploadAvatarFile,
} from '../repositories/profileRepository';
import {
  fetchPublicProfile as fetchPublicProfileRow,
  type PublicProfile,
} from '../repositories/publicProfileRepository';
import type { Profile } from '../types';

export type { PublicProfile };

export async function loadActiveFeatures(): Promise<string[]> {
  return fetchMyFeatureFlags();
}

export async function loadUserProfile(userId: string): Promise<Profile | null> {
  return fetchProfileById(userId);
}

/** Sube el avatar y deja la URL guardada en el perfil en una sola operacion. */
export async function changeAvatar(userId: string, file: File): Promise<string> {
  const avatarUrl = await uploadAvatarFile(userId, file);
  await updateProfileFields(userId, { avatar_url: avatarUrl });
  return avatarUrl;
}

export async function saveProfileFields(userId: string, updates: Partial<Profile>): Promise<void> {
  return updateProfileFields(userId, updates);
}

/**
 * Ficha publica de otra persona, la que se ve al pulsar su nombre en la
 * comunidad o en el chat.
 *
 * Existe para que la interfaz no llame al repositorio directamente:
 * `PublicProfileModal` lo hacia y se saltaba la capa de servicios, que es
 * justo donde despues hay que meter permisos, cache o normalizacion sin tocar
 * cada pantalla que muestre un perfil.
 */
export async function loadPublicProfile(userId: string): Promise<PublicProfile | null> {
  return fetchPublicProfileRow(userId);
}
