import {
  fetchCommunityMessageRows,
  fetchCommunitySenderProfile,
  insertCommunityMessage,
  subscribeToCommunityMessageInserts,
  type CommunityMessageRow,
} from '../repositories/communityRepository';

export interface CommunityMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_profile?: {
    full_name?: string;
    avatar_url?: string;
    show_premium_frame?: boolean;
  };
}

function mapCommunityMessageRow(row: CommunityMessageRow): CommunityMessage {
  const senderProfile = Array.isArray(row.sender_profile)
    ? row.sender_profile[0]
    : row.sender_profile;

  return {
    id: row.id,
    sender_id: row.sender_id,
    message: row.message,
    created_at: row.created_at,
    sender_profile: senderProfile
      ? {
          full_name: senderProfile.full_name ?? undefined,
          avatar_url: senderProfile.avatar_url ?? undefined,
          show_premium_frame: senderProfile.show_premium_frame ?? undefined,
        }
      : undefined,
  };
}

export async function fetchCommunityMessages(): Promise<CommunityMessage[]> {
  const rows = await fetchCommunityMessageRows();
  return rows.map(mapCommunityMessageRow).reverse();
}

export async function sendCommunityMessage(senderId: string, message: string): Promise<void> {
  await insertCommunityMessage(senderId, message);
}

export function subscribeToCommunityMessages(
  onMessage: (message: CommunityMessage) => void
): () => void {
  return subscribeToCommunityMessageInserts(async (row) => {
    if (row.receiver_id) {
      return;
    }

    const senderProfile = await fetchCommunitySenderProfile(row.sender_id);
    onMessage(
      mapCommunityMessageRow({
        ...row,
        sender_profile: senderProfile,
      })
    );
  });
}
