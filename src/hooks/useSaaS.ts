import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Plan, Feature, PlanFeature, Profile, UserFeatureOverride } from '../types';

export function useSaaS() {
  const getFeatures = useCallback(async (): Promise<Feature[]> => {
    const { data, error } = await supabase.from('features').select('*').order('name');
    if (error) { console.error('Error fetching features:', error); return []; }
    return data || [];
  }, []);

  const getPlans = useCallback(async (): Promise<Plan[]> => {
    const { data, error } = await supabase.from('plans').select('*').order('name');
    if (error) { console.error('Error fetching plans:', error); return []; }
    return data || [];
  }, []);

  const getPlanFeatures = useCallback(async (planId: string): Promise<PlanFeature[]> => {
    const { data, error } = await supabase.from('plan_features').select('*').eq('plan_id', planId);
    if (error) { console.error('Error fetching plan features:', error); return []; }
    return data || [];
  }, []);

  const getProfiles = useCallback(async (): Promise<Profile[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) { console.error('Error fetching profiles:', error); return []; }
    return data || [];
  }, []);

  const getUserOverrides = useCallback(async (userId: string): Promise<UserFeatureOverride[]> => {
    const { data, error } = await supabase.from('user_feature_overrides').select('*').eq('user_id', userId);
    if (error) { console.error('Error fetching user overrides:', error); return []; }
    return data || [];
  }, []);

  // --- MUTACIONES ---

  const createPlan = useCallback(async (plan: Partial<Plan>) => {
    const { data, error } = await supabase.from('plans').insert([plan]).select().single();
    if (error) throw error;
    return data;
  }, []);

  const updatePlan = useCallback(async (id: string, updates: Partial<Plan>) => {
    const { data, error } = await supabase.from('plans').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }, []);

  const assignFeatureToPlan = useCallback(async (planId: string, featureId: string) => {
    const { error } = await supabase.from('plan_features').insert([{ plan_id: planId, feature_id: featureId }]);
    if (error && error.code !== '23505') throw error; // Ignorar duplicate key
  }, []);

  const removeFeatureFromPlan = useCallback(async (planId: string, featureId: string) => {
    const { error } = await supabase.from('plan_features').delete().match({ plan_id: planId, feature_id: featureId });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  }, []);

  const assignFeatureToUser = useCallback(async (userId: string, featureId: string, expiresAt: string | null = null) => {
    const payload = { user_id: userId, feature_id: featureId, expires_at: expiresAt };
    const { error } = await supabase.from('user_feature_overrides')
      .upsert([payload], { onConflict: 'user_id, feature_id' });
    if (error) throw error;
  }, []);

  const removeFeatureFromUser = useCallback(async (userId: string, featureId: string) => {
    const { error } = await supabase.from('user_feature_overrides').delete().match({ user_id: userId, feature_id: featureId });
    if (error) throw error;
  }, []);

  const saveFeature = useCallback(async (feature: Partial<Feature>) => {
    if (feature.id) {
      const { data, error } = await supabase.from('features').update(feature).eq('id', feature.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('features').insert([feature]).select().single();
      if (error) throw error;
      return data;
    }
  }, []);

  return {
    getFeatures,
    getPlans,
    getPlanFeatures,
    getProfiles,
    getUserOverrides,
    createPlan,
    updatePlan,
    assignFeatureToPlan,
    removeFeatureFromPlan,
    updateProfile,
    assignFeatureToUser,
    removeFeatureFromUser,
    saveFeature
  };
}
