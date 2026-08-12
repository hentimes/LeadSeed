import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile, Requirement } from '../types';
import type { LeadRow } from './leadsRepository';
import { uniqueChannelName } from '../utils/realtimeChannel';

export interface AdminUnreadMessageRow {
  sender_id: string;
}

export interface AdminTelemetryRow {
  section: string;
  total_seconds: number;
  last_updated_at: string;
}

export interface AdminTemplateRow {
  id: string;
  user_id?: string;
  name: string;
  content: string;
  template_list_ids?: number[];
  lead_ids?: string[];
  lead_list_ids?: number[];
  created_at?: string;
  type?: string;
}

export interface InteractionMessageRow {
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export interface AdminLeadAlertRow {
  observed_user_id: string;
  unseen_new_leads_count: number | null;
  latest_lead_created_at: string | null;
}

export interface AdminObservedAppointmentRow {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source_channel: string | null;
  capture_ref: string | null;
  notes: string | null;
  meet_link: string | null;
  google_event_id: string | null;
  google_sync_status: string | null;
  google_sync_error: string | null;
  google_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLeadEventRow {
  id: string;
  admin_user_id: string;
  observed_user_id: string;
  lead_id: string;
  event_kind: 'lead_created';
  created_at: string;
}

export type ProfileChangesPayload = RealtimePostgresChangesPayload<Profile>;
export type LeadChangesPayload = RealtimePostgresChangesPayload<LeadRow>;
export type AdminLeadEventChangesPayload = RealtimePostgresChangesPayload<AdminLeadEventRow>;

export async function fetchUnreadAdminMessageRows(receiverId: string): Promise<AdminUnreadMessageRow[]> {
  const { data, error } = await supabase
    .from('internal_messages')
    .select('sender_id')
    .eq('receiver_id', receiverId)
    .eq('is_read', false);

  if (error || !data) {
    return [];
  }

  return data as AdminUnreadMessageRow[];
}

export function subscribeToProfilesChanges(onChange: (payload: ProfileChangesPayload) => void): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('admin_profiles_changes'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe();
}

export function subscribeToInternalMessageChanges(onChange: () => void): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('admin_unread_msgs'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages' }, onChange)
    .subscribe();
}

export function subscribeToLeadChanges(adminUserId: string, onChange: (payload: AdminLeadEventChangesPayload) => void): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('admin_lead_alerts', adminUserId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_lead_events',
        filter: `admin_user_id=eq.${adminUserId}`,
      },
      onChange,
    )
    .subscribe();
}

export async function updateHelperFlagForUsers(userIds: string[], isHelper: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_helper: isHelper }).in('id', userIds);
  if (error) {
    throw error;
  }
}

export async function fetchOpenRequirementsCountRow(): Promise<number> {
  const { count } = await supabase.from('requirements').select('*', { count: 'exact', head: true }).eq('status', 'open');
  return count || 0;
}

export function subscribeToRequirementsChanges(channelName: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requirements' }, onChange)
    .subscribe();
}

export async function fetchRequirementRows(): Promise<Requirement[]> {
  const { data, error } = await supabase.from('requirements').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    return [];
  }
  return data as Requirement[];
}

export async function fetchProfilesByIds(profileIds: string[]): Promise<Profile[]> {
  if (profileIds.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', profileIds);
  if (error || !data) {
    return [];
  }
  return data as Profile[];
}

export async function fetchHelperProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').or('is_helper.eq.true,role.eq.admin');
  if (error || !data) {
    return [];
  }
  return data as Profile[];
}

export async function updateRequirementRow(requirementId: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('requirements').update(payload).eq('id', requirementId);
  if (error) {
    throw error;
  }
}

export async function fetchAdminUserLeadRows(userId: string): Promise<LeadRow[]> {
  const { data, error } = await supabase.rpc('list_admin_user_leads', {
    p_observed_user_id: userId,
    p_limit: null,
  });
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function fetchAdminLeadAlertRows(): Promise<AdminLeadAlertRow[]> {
  const { data, error } = await supabase.rpc('list_admin_user_lead_alerts');
  if (error) throw error;
  return (data ?? []) as AdminLeadAlertRow[];
}

export async function markAdminObservedUserLeadsSeen(userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_admin_user_leads_seen', {
    p_observed_user_id: userId,
  });
  if (error) throw error;
}

export async function fetchAdminObservedAppointmentRows(userId: string, from: string, to: string): Promise<AdminObservedAppointmentRow[]> {
  const { data, error } = await supabase.rpc('list_admin_user_appointments', {
    p_observed_user_id: userId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return (data ?? []) as AdminObservedAppointmentRow[];
}

export async function fetchAdminUserTemplateRows(userId: string): Promise<AdminTemplateRow[]> {
  const { data, error } = await supabase.rpc('list_admin_user_templates', {
    p_observed_user_id: userId,
  });
  if (error) throw error;
  return (data ?? []) as AdminTemplateRow[];
}

export async function transferAdminUserLeads(targetUserId: string, leadIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('admin_transfer_leads', {
    target_user_id: targetUserId,
    lead_ids: leadIds,
  });
  if (error) throw error;
}

export async function transferAdminUserTemplates(targetUserId: string, templateIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('admin_transfer_templates', {
    target_user_id: targetUserId,
    template_ids: templateIds,
  });
  if (error) throw error;
}

export async function fetchAdminUserRecentLeadRows(userId: string): Promise<LeadRow[]> {
  const { data, error } = await supabase.rpc('list_admin_user_leads', {
    p_observed_user_id: userId,
    p_limit: 50,
  });
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function fetchAdminUserTemplateTypeRows(userId: string): Promise<Array<Pick<AdminTemplateRow, 'type'>>> {
  const { data, error } = await supabase.rpc('list_admin_user_templates', {
    p_observed_user_id: userId,
  });
  if (error) throw error;
  return ((data ?? []) as AdminTemplateRow[]).map((row) => ({ type: row.type }));
}

export async function fetchAdminTelemetryRows(userId: string): Promise<AdminTelemetryRow[]> {
  const { data } = await supabase
    .from('user_telemetry')
    .select('section, total_seconds, last_updated_at')
    .eq('user_id', userId)
    .order('total_seconds', { ascending: false });
  return (data ?? []) as AdminTelemetryRow[];
}

export async function fetchHelperRequirementRows(helperId: string): Promise<Requirement[]> {
  const { data } = await supabase.from('requirements').select('*').eq('helper_id', helperId);
  return (data ?? []) as Requirement[];
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*');
  return (data ?? []) as Profile[];
}

export async function fetchInteractionMessageRows(userId: string): Promise<InteractionMessageRow[]> {
  const { data } = await supabase
    .from('internal_messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  return (data ?? []) as InteractionMessageRow[];
}

export async function removeAdminChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
