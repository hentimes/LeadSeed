import { supabase } from '../lib/supabaseClient';
import type { Page } from '../types';

export async function incrementTelemetry(userId: string, section: Page, seconds: number): Promise<void> {
  const { error } = await supabase.rpc('increment_telemetry', {
    p_user_id: userId,
    p_section: section,
    p_seconds: seconds,
  });

  if (error) {
    throw error;
  }
}
