import { useState, useEffect } from 'react';
import { db } from '../db/database';

export function useSendCounts() {
  const [counts, setCounts] = useState<Record<number, { whatsapp: number; email: number }>>({});

  useEffect(() => {
    (async () => {
      const sendLogs = await db.sendLog.toArray();
      const newCounts: Record<number, { whatsapp: number; email: number }> = {};
      
      for (const log of sendLogs) {
        if (!newCounts[log.leadId]) {
          newCounts[log.leadId] = { whatsapp: 0, email: 0 };
        }
        if (log.templateType === 'whatsapp') {
          newCounts[log.leadId].whatsapp++;
        } else if (log.templateType === 'email') {
          newCounts[log.leadId].email++;
        }
      }
      
      setCounts(newCounts);
    })();
  }, []);

  return counts;
}
