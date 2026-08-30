import { supabase } from '../lib/supabaseClient';
import type { Feature, Plan, PlanFeature, Profile, UserFeatureOverride } from '../types';

export async function fetchFeatures(): Promise<Feature[]> {
  const { data, error } = await supabase.from('features').select('*').order('name');
  if (error) {
    console.error('Error fetching features:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from('plans').select('*').order('name');
  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlanFeatures(planId: string): Promise<PlanFeature[]> {
  const { data, error } = await supabase.from('plan_features').select('*').eq('plan_id', planId);
  if (error) {
    console.error('Error fetching plan features:', error);
    return [];
  }
  return data || [];
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data || [];
}

export async function fetchUserOverrides(userId: string): Promise<UserFeatureOverride[]> {
  const { data, error } = await supabase.from('user_feature_overrides').select('*').eq('user_id', userId);
  if (error) {
    console.error('Error fetching user overrides:', error);
    return [];
  }
  return data || [];
}

export async function insertPlan(plan: Partial<Plan>): Promise<Plan> {
  const { data, error } = await supabase.from('plans').insert([plan]).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function patchPlan(id: string, updates: Partial<Plan>): Promise<Plan> {
  const { data, error } = await supabase.from('plans').update(updates).eq('id', id).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function insertPlanFeature(planId: string, featureId: string): Promise<void> {
  const { error } = await supabase.from('plan_features').insert([{ plan_id: planId, feature_id: featureId }]);
  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function deletePlanFeature(planId: string, featureId: string): Promise<void> {
  const { error } = await supabase.from('plan_features').delete().match({ plan_id: planId, feature_id: featureId });
  if (error) {
    throw error;
  }
}

export async function patchProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function upsertUserOverride(userId: string, featureId: string, expiresAt: string | null): Promise<void> {
  const payload = { user_id: userId, feature_id: featureId, expires_at: expiresAt };
  const { error } = await supabase
    .from('user_feature_overrides')
    .upsert([payload], { onConflict: 'user_id, feature_id' });
  if (error) {
    throw error;
  }
}

export async function deleteUserOverride(userId: string, featureId: string): Promise<void> {
  const { error } = await supabase.from('user_feature_overrides').delete().match({ user_id: userId, feature_id: featureId });
  if (error) {
    throw error;
  }
}

export async function upsertFeature(feature: Partial<Feature>): Promise<Feature> {
  if (feature.id) {
    const { data, error } = await supabase.from('features').update(feature).eq('id', feature.id).select().single();
    if (error) {
      throw error;
    }
    return data;
  }

  const { data, error } = await supabase.from('features').insert([feature]).select().single();
  if (error) {
    throw error;
  }
  return data;
}
