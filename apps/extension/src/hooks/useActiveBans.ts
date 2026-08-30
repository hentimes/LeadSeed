import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchActiveBans, liftBan, type ChatUserBan } from '../services/chatModerationService';
import { fetchPublicProfile } from '../repositories/publicProfileRepository';

export interface ActiveBanDisplay extends ChatUserBan {
  userName: string;
}

/** Baneos activos, solo tiene sentido pedirlo si sos staff. */
export function useActiveBans(enabled: boolean) {
  const { user } = useAuth();
  const [bans, setBans] = useState<ActiveBanDisplay[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const activeBans = await fetchActiveBans();
    const withNames = await Promise.all(
      activeBans.map(async (ban) => {
        const profile = await fetchPublicProfile(ban.user_id);
        return { ...ban, userName: profile?.full_name || 'Usuario' };
      })
    );
    setBans(withNames);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lift = useCallback(
    async (banId: string) => {
      if (!user) return;
      await liftBan(banId, user.id);
      await refresh();
    },
    [user, refresh]
  );

  return { bans, lift, refresh };
}
