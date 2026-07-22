import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeadSendCountsForUser } from '../services/historyService';

export function useSendCounts() {
  const [counts, setCounts] = useState<Record<string, { whatsapp: number; email: number }>>({});
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCounts({});
      return;
    }

    void (async () => {
      const nextCounts = await fetchLeadSendCountsForUser(user.id);
      if (!cancelled) {
        setCounts(nextCounts);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return counts;
}
