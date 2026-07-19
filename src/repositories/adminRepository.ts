import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile, Requirement } from '../types';
import type { LeadRow } from './leadsRepository';

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

export type ProfileChangesPayload = RealtimePostgresChangesPayload<Profile>;

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
    .channel('admin_profiles_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe();
}

export function subscribeToInternalMessageChanges(onChange: () => void): RealtimeChannel {
  return supabase
    .channel('admin_unread_msgs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages' }, onChange)
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
  const { data } = await supabase.from('leads').select('*').eq('user_id', userId).is('deleted_at', null);
  return (data ?? []) as LeadRow[];
}

export async function fetchAdminUserTemplateRows(userId: string): Promise<AdminTemplateRow[]> {
  const { data } = await supabase.from('templates').select('*').eq('user_id', userId);
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
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as LeadRow[];
}

export async function fetchAdminUserTemplateTypeRows(userId: string): Promise<Array<Pick<AdminTemplateRow, 'type'>>> {
  const { data } = await supabase.from('templates').select('type').eq('user_id', userId);
  return (data ?? []) as Array<Pick<AdminTemplateRow, 'type'>>;
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
