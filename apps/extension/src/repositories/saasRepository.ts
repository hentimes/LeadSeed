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

/**
 * Alta o edicion de una funcionalidad del catalogo.
 *
 * EL ALTA NO FUNCIONABA. Hacia `insert([feature])` con un objeto sin `id`,
 * contra una columna `text PRIMARY KEY` sin valor por defecto, asi que violaba
 * la restriccion de no-nulo y fallaba siempre. El formulario tampoco lo
 * recogia: tenia un campo rotulado "Codigo" enlazado a `name`.
 *
 * Ahora el `id` es obligatorio en los dos casos y lo distingue `esAlta`, no la
 * presencia del id. Un `upsert` a secas tampoco servia: en la edicion machacaria
 * con nulos las columnas que el formulario no manda.
 */
export async function upsertFeature(feature: Partial<Feature>, esAlta: boolean): Promise<Feature> {
  const id = feature.id?.trim();
  if (!id) {
    throw new Error('Falta el identificador de la funcionalidad.');
  }

  if (!esAlta) {
    const { data, error } = await supabase
      .from('features')
      // Sin el `id`: es la clave por la que se busca y no se cambia nunca.
      .update({
        name: feature.name,
        description: feature.description,
        is_active: feature.is_active,
        trial_days: feature.trial_days,
        category: feature.category,
        sort_order: feature.sort_order,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('features')
    .insert([{ ...feature, id }])
    .select()
    .single();

  if (error) {
    // 23505 es clave duplicada. El mensaje crudo de Postgres nombra el indice,
    // que no le dice nada a quien esta rellenando un formulario.
    if ((error as { code?: string }).code === '23505') {
      throw new Error(`Ya existe una funcionalidad con el identificador «${id}».`);
    }
    throw error;
  }
  return data;
}
