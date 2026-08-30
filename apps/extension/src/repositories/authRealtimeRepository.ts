/**
 * Suscripciones realtime del contexto de autenticacion: cambios de perfil,
 * de overrides de funcionalidades y del plan del usuario.
 *
 * Estaba en `services/realtimeService.ts` importando el cliente de Supabase
 * directamente, que era la ultima fuga de la frontera "el cliente vive solo en
 * repositorios". Ver roadmap 13.4.
 *
 * Los nombres de canal ya incluyen el `userId`, asi que no colisionan entre
 * usuarios. No llevan sufijo de instancia porque `AuthContext` es unico en la
 * aplicacion: hay exactamente una suscripcion viva de cada tipo.
 */
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export function subscribeToUserUpdates(
  userId: string,
  onProfileChange: (newProfile: Profile) => void,
  onFeaturesChange: () => void
): () => void {
  const channel = supabase
    .channel(`auth_entitlements_${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload) => {
        onProfileChange(payload.new as Profile);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_feature_overrides', filter: `user_id=eq.${userId}` },
      () => {
        onFeaturesChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToPlanUpdates(
  userId: string,
  planId: string,
  onFeaturesChange: () => void
): () => void {
  const channel = supabase
    .channel(`auth_plan_features_${userId}_${planId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plan_features', filter: `plan_id=eq.${planId}` },
      () => {
        onFeaturesChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
