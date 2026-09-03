import { useCallback } from 'react';
import {
  deletePlanFeature,
  deleteUserOverride,
  fetchFeatures,
  fetchPlanFeatures,
  fetchPlans,
  fetchProfiles,
  fetchUserOverrides,
  insertPlan,
  insertPlanFeature,
  patchPlan,
  patchProfile,
  upsertFeature,
  upsertUserOverride,
} from '../repositories/saasRepository';
import type { Feature, Plan, PlanFeature, Profile, UserFeatureOverride } from '../types';

export function useSaaS() {
  const getFeatures = useCallback(async (): Promise<Feature[]> => {
    return fetchFeatures();
  }, []);

  const getPlans = useCallback(async (): Promise<Plan[]> => {
    return fetchPlans();
  }, []);

  const getPlanFeatures = useCallback(async (planId: string): Promise<PlanFeature[]> => {
    return fetchPlanFeatures(planId);
  }, []);

  const getProfiles = useCallback(async (): Promise<Profile[]> => {
    return fetchProfiles();
  }, []);

  const getUserOverrides = useCallback(async (userId: string): Promise<UserFeatureOverride[]> => {
    return fetchUserOverrides(userId);
  }, []);

  const createPlan = useCallback(async (plan: Partial<Plan>) => {
    return insertPlan(plan);
  }, []);

  const updatePlan = useCallback(async (id: string, updates: Partial<Plan>) => {
    return patchPlan(id, updates);
  }, []);

  const assignFeatureToPlan = useCallback(async (planId: string, featureId: string) => {
    await insertPlanFeature(planId, featureId);
  }, []);

  const removeFeatureFromPlan = useCallback(async (planId: string, featureId: string) => {
    await deletePlanFeature(planId, featureId);
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: Partial<Profile>) => {
    return patchProfile(userId, updates);
  }, []);

  const assignFeatureToUser = useCallback(async (userId: string, featureId: string, expiresAt: string | null = null) => {
    await upsertUserOverride(userId, featureId, expiresAt);
  }, []);

  const removeFeatureFromUser = useCallback(async (userId: string, featureId: string) => {
    await deleteUserOverride(userId, featureId);
  }, []);

  const saveFeature = useCallback(async (feature: Partial<Feature>) => {
    return upsertFeature(feature);
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
    saveFeature,
  };
}
