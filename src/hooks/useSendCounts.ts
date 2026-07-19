import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchRecentSendLogsForUser, buildLeadSendCounts } from '../services/historyService';

export function useSendCounts() {
  const [counts, setCounts] = useState<Record<string, { whatsapp: number; email: number }>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCounts({});
      return;
    }

    void (async () => {
      const sendLogs = await fetchRecentSendLogsForUser(user.id);
      setCounts(buildLeadSendCounts(sendLogs));
    })();
  }, [user]);

  return counts;
}
