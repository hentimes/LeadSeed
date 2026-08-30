import * as repo from '../repositories/chatModerationRepository';

export const {
  fetchBlockedUserIds,
  blockUser,
  unblockUser,
  fetchMutedUserIds,
  muteUser,
  unmuteUser,
  reportMessage,
  fetchPendingReports,
  fetchPendingReportCount,
  resolveReport,
  deleteReportedMessage,
  fetchMyActiveChatBan,
  fetchActiveBans,
  banUser,
  liftBan,
  fetchHighlightedMessages,
  fetchMyHighlightedMessageIds,
  highlightMessage,
  removeHighlight,
} = repo;

export type {
  ChatMessageReport,
  ChatUserBan,
  ChatHighlightedMessage,
} from '../repositories/chatModerationRepository';
