import type { AdminObservedLeadAlert, AgendaAppointment, Profile, Requirement } from '../types';
import type { LeadRow } from '../repositories/leadsRepository';
import { mapLeadRowToDomain } from './leadsService';
import { fetchLeadRows } from '../repositories/leadsRepository';
import { fetchTemplateRowsByUserId } from '../repositories/templatesRepository';
import {
  type AdminLeadEventChangesPayload,
  type AdminLeadAlertRow,
  type AdminObservedAppointmentRow,
  type AdminTemplateRow,
  type InteractionMessageRow,
  type ProfileChangesPayload,
  fetchAdminLeadAlertRows,
  fetchAdminObservedAppointmentRows,
  fetchAdminTelemetryRows,
  fetchAdminUserLeadRows,
  fetchAdminUserRecentLeadRows,
  fetchAdminUserTemplateRows,
  fetchAdminUserTemplateTypeRows,
  fetchAllProfiles,
  fetchHelperProfiles,
  fetchHelperRequirementRows,
  fetchInteractionMessageRows,
  fetchOpenRequirementsCountRow,
  fetchProfilesByIds,
  fetchRequirementRows,
  fetchUnreadAdminMessageRows,
  markAdminObservedUserLeadsSeen,
  removeAdminChannel,
  subscribeToLeadChanges,
  subscribeToInternalMessageChanges,
  subscribeToProfilesChanges,
  subscribeToRequirementsChanges,
  transferAdminUserLeads,
  transferAdminUserTemplates,
  updateHelperFlagForUsers,
  updateRequirementRow,
} from '../repositories/adminRepository';

export function buildUnreadCounts(rows: Array<{ sender_id: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
  }
  return counts;
}

export async function loadUnreadCountsForAdmin(receiverId: string): Promise<Record<string, number>> {
  return buildUnreadCounts(await fetchUnreadAdminMessageRows(receiverId));
}

export function subscribeAdminUsersRealtime(
  adminUserId: string,
  onProfilesChange: (payload: ProfileChangesPayload) => void,
  onUnreadChange: () => void,
  onLeadsChange: (payload: AdminLeadEventChangesPayload) => void
): () => void {
  const profilesChannel = subscribeToProfilesChanges(onProfilesChange);
  const messagesChannel = subscribeToInternalMessageChanges(onUnreadChange);
  const leadsChannel = subscribeToLeadChanges(adminUserId, onLeadsChange);
  return () => {
    void removeAdminChannel(profilesChannel);
    void removeAdminChannel(messagesChannel);
    void removeAdminChannel(leadsChannel);
  };
}

export async function bulkSetUsersAsHelper(userIds: string[], isHelper: boolean): Promise<void> {
  await updateHelperFlagForUsers(userIds, isHelper);
}

export async function loadOpenRequirementsCount(): Promise<number> {
  return fetchOpenRequirementsCountRow();
}

export function subscribeOpenRequirementsCount(onChange: () => void): () => void {
  const channel = subscribeToRequirementsChanges('admin_reqs_count', onChange);
  return () => {
    void removeAdminChannel(channel);
  };
}

export async function loadRequirementsWithProfiles(): Promise<Requirement[]> {
  const requirements = await fetchRequirementRows();
  const profileIds = [...new Set(requirements.flatMap((req) => [req.user_id, req.helper_id]).filter(Boolean) as string[])];
  const profiles = await fetchProfilesByIds(profileIds);

  return requirements.map((req) => ({
    ...req,
    user_profile: profiles.find((profile) => profile.id === req.user_id),
    helper_profile: profiles.find((profile) => profile.id === req.helper_id),
  })) as Requirement[];
}

export async function loadHelperProfiles(): Promise<Profile[]> {
  return fetchHelperProfiles();
}

export function subscribeRequirementsFeed(onChange: () => void, channelName = 'admin_req_changes'): () => void {
  const channel = subscribeToRequirementsChanges(channelName, onChange);
  return () => {
    void removeAdminChannel(channel);
  };
}

export async function closeRequirement(requirementId: string): Promise<void> {
  await updateRequirementRow(requirementId, { status: 'closed' });
}

export async function archiveRequirement(requirementId: string): Promise<void> {
  await updateRequirementRow(requirementId, { status: 'archived' });
}

export async function assignRequirementToHelper(requirementId: string, helperId: string): Promise<void> {
  await updateRequirementRow(requirementId, { helper_id: helperId, status: 'in_progress' });
}

export async function loadAdminUserBase(userId: string, currentUserId?: string) {
  const isSelfObservation = !!currentUserId && currentUserId === userId;

  const leadTask = isSelfObservation ? fetchLeadRows(userId) : fetchAdminUserLeadRows(userId);
  const templateTask = isSelfObservation ? fetchTemplateRowsByUserId(userId) : fetchAdminUserTemplateRows(userId);

  const [leadResult, templateResult] = await Promise.allSettled([leadTask, templateTask]);

  if (leadResult.status === 'rejected') {
    throw leadResult.reason instanceof Error ? leadResult.reason : new Error('No se pudo cargar los leads observados');
  }

  if (templateResult.status === 'rejected') {
    throw templateResult.reason instanceof Error ? templateResult.reason : new Error('No se pudo cargar las plantillas observadas');
  }

  const leadRows = leadResult.value as LeadRow[];
  const templateRows = templateResult.value as AdminTemplateRow[];

  return {
    leads: leadRows.map((row: LeadRow) => mapLeadRowToDomain(row)),
    templates: templateRows.map((row: AdminTemplateRow) => ({
      id: row.id,
      nombre: row.name,
      contenido: row.content,
      templateListIds: row.template_list_ids || [],
      leadIds: row.lead_ids || [],
      leadListIds: row.lead_list_ids || [],
      createdAt: row.created_at || new Date(0).toISOString(),
    })),
  };
}

function mapAdminLeadAlertRow(row: AdminLeadAlertRow): AdminObservedLeadAlert {
  return {
    observedUserId: row.observed_user_id,
    unseenNewLeadsCount: Number(row.unseen_new_leads_count || 0),
    latestLeadCreatedAt: row.latest_lead_created_at || undefined,
  };
}

function mapAdminObservedAppointmentRow(row: AdminObservedAppointmentRow): AgendaAppointment {
  return {
    id: row.id,
    leadId: row.lead_id || undefined,
    leadName: row.lead_name || 'Lead sin nombre',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    sourceChannel: row.source_channel || 'general',
    captureRef: row.capture_ref || undefined,
    notes: row.notes || '',
    meetLink: row.meet_link || undefined,
    googleEventId: row.google_event_id || undefined,
    googleSyncStatus: row.google_sync_status || undefined,
    googleSyncError: row.google_sync_error || undefined,
    googleSyncedAt: row.google_synced_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadAdminLeadAlerts(): Promise<Record<string, number>> {
  const rows = await fetchAdminLeadAlertRows();
  return rows
    .map(mapAdminLeadAlertRow)
    .reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.observedUserId] = row.unseenNewLeadsCount;
      return accumulator;
    }, {});
}

export async function markAdminUserBaseSeen(userId: string): Promise<void> {
  await markAdminObservedUserLeadsSeen(userId);
}

export async function loadAdminUserAgenda(userId: string, from: string, to: string): Promise<AgendaAppointment[]> {
  const rows = await fetchAdminObservedAppointmentRows(userId, from, to);
  return rows.map(mapAdminObservedAppointmentRow);
}

export async function transferAdminUserAssets(targetUserId: string, leadIds: string[], templateIds: string[]): Promise<void> {
  if (leadIds.length > 0) await transferAdminUserLeads(targetUserId, leadIds);
  if (templateIds.length > 0) await transferAdminUserTemplates(targetUserId, templateIds);
}

export async function loadAdminUserInventory(userId: string) {
  const [leadRows, templateRows] = await Promise.all([
    fetchAdminUserRecentLeadRows(userId),
    fetchAdminUserTemplateTypeRows(userId),
  ]);

  const counts = { whatsapp: 0, email: 0, call: 0 };
  for (const row of templateRows as Array<{ type?: string }>) {
    if (row.type === 'whatsapp') counts.whatsapp += 1;
    else if (row.type === 'email') counts.email += 1;
    else if (row.type === 'call') counts.call += 1;
  }

  return {
    leads: leadRows.map((row: LeadRow) => mapLeadRowToDomain(row)),
    templatesCount: counts,
  };
}

export async function loadAdminUserTelemetry(userId: string) {
  return fetchAdminTelemetryRows(userId);
}

export async function loadAdminHelperStats(userId: string) {
  return fetchHelperRequirementRows(userId);
}

export async function loadAdminUserHeatmap(selectedUser: Profile) {
  const [profiles, messages] = await Promise.all([fetchAllProfiles(), fetchInteractionMessageRows(selectedUser.id)]);
  const interactionMap: Record<string, { count: number; lastMsg: string }> = {};

  for (const msg of messages as InteractionMessageRow[]) {
    const otherUserId = msg.sender_id === selectedUser.id ? msg.receiver_id : msg.sender_id;
    if (!otherUserId) continue;
    if (!interactionMap[otherUserId]) {
      interactionMap[otherUserId] = { count: 0, lastMsg: msg.created_at };
    }
    interactionMap[otherUserId].count += 1;
    if (new Date(msg.created_at) > new Date(interactionMap[otherUserId].lastMsg)) {
      interactionMap[otherUserId].lastMsg = msg.created_at;
    }
  }

  return Object.keys(interactionMap)
    .map((userId) => ({
      profile:
        profiles.find((profile) => profile.id === userId) ||
        ({ id: userId, email: 'Usuario Eliminado', role: 'user', created_at: '' } as Profile),
      messageCount: interactionMap[userId].count,
      lastInteraction: interactionMap[userId].lastMsg,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);
}
