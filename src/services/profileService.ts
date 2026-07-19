import { fetchMyFeatureFlags, fetchProfileById } from '../repositories/profileRepository';
import type { Profile } from '../types';

export async function loadActiveFeatures(): Promise<string[]> {
  return fetchMyFeatureFlags();
}

export async function loadUserProfile(userId: string): Promise<Profile | null> {
  return fetchProfileById(userId);
}
