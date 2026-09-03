import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteReportedMessage,
  fetchPendingReports,
  resolveReport,
  type ChatMessageReport,
} from '../services/chatModerationService';

/** Cola de reportes pendientes, solo tiene sentido para admin/helper. */
export function useReportedMessages(enabled: boolean) {
  const { user } = useAuth();
  const [reports, setReports] = useState<ChatMessageReport[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setReports(await fetchPendingReports());
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismiss = useCallback(
    async (reportId: string) => {
      if (!user) return;
      await resolveReport(reportId, user.id, 'dismissed');
      await refresh();
    },
    [user, refresh]
  );

  const deleteMessage = useCallback(
    async (report: ChatMessageReport) => {
      if (!user) return;
      await deleteReportedMessage(report.message_id);
      await resolveReport(report.id, user.id, 'resolved');
      await refresh();
    },
    [user, refresh]
  );

  return { reports, dismiss, deleteMessage, refresh };
}
