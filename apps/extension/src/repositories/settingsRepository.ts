import { supabase } from '../lib/supabaseClient';
import { fetchCurrentSession } from './authRepository';

import type { AppSettings } from '../types';

export interface ProfileSettingsRow {
  compact_mode: boolean | null;
  dark_mode: boolean | null;
  visible_cols: AppSettings['visibleCols'] | null;
  email_provider: 'emailjs' | 'resend' | 'gmail' | null;
  resend_from_name: string | null;
  resend_from_email: string | null;
  export_format: 'json' | 'excel' | null;
  daily_goal_whatsapp: number | null;
  daily_goal_email: number | null;
  daily_goal_calls: number | null;
  dashboard_compare_period: 'yesterday' | 'lastWeek' | 'lastMonth' | 'lastYear' | null;
  whatsapp_client_preference: 'web' | 'app' | null;
  hide_unnamed_leads: boolean | null;
  active_smart_lists: string[] | null;
  list_groups: { id: string; name: string; listIds: (number | string)[] }[] | null;
}

const PROFILE_SETTINGS_SELECT =
  'compact_mode, dark_mode, visible_cols, email_provider, resend_from_name, resend_from_email, export_format, daily_goal_whatsapp, daily_goal_email, daily_goal_calls, dashboard_compare_period, whatsapp_client_preference, hide_unnamed_leads, active_smart_lists, list_groups';

export async function fetchAuthenticatedUserId(): Promise<string | undefined> {
  const session = await fetchCurrentSession();
  return session?.user?.id;
}

export async function fetchProfileSettingsRow(userId: string): Promise<ProfileSettingsRow | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SETTINGS_SELECT)
    .eq('id', userId)
    .single();

  if (error || !data) {
    return undefined;
  }

  return data as ProfileSettingsRow;
}

export async function updateProfileSettingsRow(
  userId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) {
    throw error;
  }
}
