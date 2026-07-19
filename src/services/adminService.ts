import type { Profile, Requirement } from '../types';
import type { LeadRow } from '../repositories/leadsRepository';
import { mapLeadRowToDomain } from './leadsService';
import {
  type AdminTemplateRow,
  type InteractionMessageRow,
  type ProfileChangesPayload,
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
  removeAdminChannel,
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
  onProfilesChange: (payload: ProfileChangesPayload) => void,
  onUnreadChange: () => void
): () => void {
  const profilesChannel = subscribeToProfilesChanges(onProfilesChange);
  const messagesChannel = subscribeToInternalMessageChanges(onUnreadChange);
  return () => {
    void removeAdminChannel(profilesChannel);
    void removeAdminChannel(messagesChannel);
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

export async function loadAdminUserBase(userId: string) {
  const [leadRows, templateRows] = await Promise.all([
    fetchAdminUserLeadRows(userId),
    fetchAdminUserTemplateRows(userId),
  ]);

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
