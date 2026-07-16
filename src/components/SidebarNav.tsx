import type { ReactNode } from 'react';
import type { Page } from '../types';
import { primaryRoutes, secondaryRoutes, RouteDef } from '../config/routes';
import { Icon } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  isAdmin?: boolean;
  onOpenProfile: () => void;
}

function NavButton({
  active,
  badge,
  badgeColor = 'bg-red-500',
  icon,
  label,
  onClick,
}: {
  active: boolean;
  badge?: number;
  badgeColor?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="group relative flex justify-center">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={[
          'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-150',
          active
            ? 'border-blue-500 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]'
            : 'border-transparent bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:hover:border-gray-700',
        ].join(' ')}
      >
        <span className="text-lg leading-none">{icon}</span>
        {badge ? (
          <span className={`absolute -right-1 -top-1 min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${badgeColor} animate-pulse shadow-sm`}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
      <div className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 rounded-xl bg-gray-950 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
        {label}
      </div>
    </div>
  );
}

export default function SidebarNav({ currentPage, onNavigate, taskCount, isAdmin, onOpenProfile }: Props) {
  const { hasFeature, loading, user, profile, signOut } = useAuth();
  const adminRoutes: RouteDef[] = (isAdmin || profile?.is_helper) ? [{ page: 'admin' as Page, label: isAdmin ? 'Admin SaaS' : 'Soporte', icon: Icon.Admin }] : [];
  const [unreadAdminMessages, setUnreadAdminMessages] = useState(0);
  const [openReqsCount, setOpenReqsCount] = useState(0);

  useEffect(() => {
    if (!isAdmin || !user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('internal_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnreadAdminMessages(count || 0);
    };
    
    const fetchOpenReqs = async () => {
      const { count } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      setOpenReqsCount(count || 0);
    };
    
    fetchUnread();
    fetchOpenReqs();
    
    const channelMsgs = supabase.channel('sidebar_unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages', filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    const channelReqs = supabase.channel('sidebar_reqs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requirements' }, () => {
        fetchOpenReqs();
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(channelMsgs); 
      supabase.removeChannel(channelReqs);
    };
  }, [isAdmin, user]);
  
  if (loading) return null;
  return (
    <aside className="flex h-full w-[68px] shrink-0 flex-col items-center justify-between border-l border-gray-200 bg-white/50 backdrop-blur-md px-2 py-4 dark:border-gray-800 dark:bg-gray-950/50 z-40 relative">
      <div className="flex w-full flex-col items-center gap-2">
        {primaryRoutes
          .filter(route => !route.requiredFeature || hasFeature(route.requiredFeature))
          .map(({ page, label, icon, badge }) => (
          <NavButton
            key={page}
            active={currentPage === page}
            badge={badge && page === 'tasks' ? taskCount : undefined}
            icon={icon()}
            label={label}
            onClick={() => onNavigate(page)}
          />
        ))}
      </div>

      <div className="flex w-full flex-col items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        {[...adminRoutes, ...secondaryRoutes]
          .filter(route => !route.requiredFeature || hasFeature(route.requiredFeature))
          .map(({ page, label, icon }) => (
          <NavButton
            key={page}
            active={currentPage === page}
            badge={page === 'admin' ? (unreadAdminMessages + openReqsCount) : undefined}
            badgeColor={page === 'admin' && openReqsCount > 0 ? 'bg-red-500' : (page === 'admin' ? 'bg-purple-600' : 'bg-red-500')}
            icon={icon()}
            label={label}
            onClick={() => onNavigate(page)}
          />
        ))}

        {/* User Profile & Logout */}
        <div className="mt-2 flex flex-col items-center gap-2 w-full pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onOpenProfile}
            title="Editar Perfil"
            className={`relative rounded-full transition-all duration-200 hover:scale-105 ${profile?.show_premium_frame && hasFeature('premium_aesthetics') ? 'ring-2 ring-yellow-400 p-[2px]' : ''}`}
          >
            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
               <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm object-cover" title={profile?.full_name || user?.user_metadata?.full_name || user?.email} />
            ) : (
               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold" title={user?.email}>
                 {user?.email?.charAt(0).toUpperCase()}
               </div>
            )}
          </button>
          <button 
            onClick={() => signOut()}
            title="Cerrar Sesión"
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Icon.Logout />
          </button>
        </div>
      </div>
    </aside>
  );
}
