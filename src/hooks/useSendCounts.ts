import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSendCounts() {
  const [counts, setCounts] = useState<Record<string, { whatsapp: number; email: number }>>({});

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      const { data: sendLogs } = await supabase
        .from('send_logs')
        .select('*')
        .eq('user_id', userId);
        
      const newCounts: Record<string, { whatsapp: number; email: number }> = {};
      
      for (const log of (sendLogs || [])) {
        if (!newCounts[log.lead_id]) {
          newCounts[log.lead_id] = { whatsapp: 0, email: 0 };
        }
        if (log.template_type === 'whatsapp') {
          newCounts[log.lead_id].whatsapp++;
        } else if (log.template_type === 'email') {
          newCounts[log.lead_id].email++;
        }
      }
      
      setCounts(newCounts);
    })();
  }, []);

  return counts;
}
