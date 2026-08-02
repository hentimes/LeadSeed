import {
  fetchMyFeatureFlags,
  fetchProfileById,
  updateProfileFields,
  uploadAvatar as uploadAvatarFile,
} from '../repositories/profileRepository';
import type { Profile } from '../types';

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
