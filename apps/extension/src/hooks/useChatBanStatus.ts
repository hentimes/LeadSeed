import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyActiveChatBan, type ChatUserBan } from '../services/chatModerationService';

/** Baneo activo del usuario actual, para reemplazar la sala por el aviso. */
export function useChatBanStatus() {
  const { user } = useAuth();
  const [ban, setBan] = useState<ChatUserBan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBan(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void fetchMyActiveChatBan().then((activeBan) => {
      if (cancelled) return;
      setBan(activeBan);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { ban, loading };
}
