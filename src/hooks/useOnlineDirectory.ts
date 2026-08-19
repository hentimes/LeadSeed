import { useMemo } from 'react';
import { usePresence } from './usePresence';
import type { OnlineUser } from '../types';
import { avatarDeIniciales } from '../utils/avatar';

export interface OnlineDirectory {
  users: OnlineUser[];
  count: number;
}

/**
 * Lista de usuarios conectados, ordenada y lista para render.
 * Envuelve usePresence para que el chat y la comunidad no repitan el
 * Object.values() ni el criterio de orden.
 */
export function useOnlineDirectory(search = ''): OnlineDirectory {
  const { onlineUsers } = usePresence();

  return useMemo(() => {
    const term = search.trim().toLowerCase();

    const users = Object.values(onlineUsers)
      .filter((user) => {
        if (!term) return true;
        const name = (user.full_name || user.email || '').toLowerCase();
        return name.includes(term);
      })
      .sort((a, b) =>
        (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')
      );

    return { users, count: users.length };
  }, [onlineUsers, search]);
}

export function displayName(user: Pick<OnlineUser, 'full_name' | 'email'>): string {
  return user.full_name || user.email?.split('@')[0] || 'Usuario';
}

export function avatarFor(user: Pick<OnlineUser, 'full_name' | 'email' | 'avatar_url'>): string {
  if (user.avatar_url) return user.avatar_url;
  return avatarDeIniciales(displayName(user));
}
