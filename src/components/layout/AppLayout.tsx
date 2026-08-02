import { ReactNode, useState } from 'react';
import Header from './Header';
import NavigationDrawer from './NavigationDrawer';
import UserMenu from './UserMenu';
import ProfileModal from '../profile/ProfileModal';
import type { Page } from '../../types';
import { usePresence } from '../../hooks/usePresence';
import { useTelemetry } from '../../hooks/useTelemetry';
import SupportFloatingChat from '../support/SupportFloatingChat';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  isAdmin?: boolean;
  children: ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, taskCount, isAdmin, children }: Props) {
  // Inicializar rastreo de telemetría y presencia global en la app
  useTelemetry(currentPage);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-muted font-sans text-ink">
      <Header 
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(prev => !prev)}
        onToggleUserMenu={() => setIsUserMenuOpen(prev => !prev)}
        currentPage={currentPage}
      />
      
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        currentPage={currentPage}
        onNavigate={onNavigate}
        taskCount={taskCount}
      />
      
      <UserMenu 
        isOpen={isUserMenuOpen} 
        onClose={() => setIsUserMenuOpen(false)} 
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onNavigateSettings={() => onNavigate('settings')}
      />

      <main className="flex-1 overflow-y-auto relative animate-fade-in z-0 px-2 sm:px-4 py-4 w-full min-w-0">
        {children}
      </main>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SupportFloatingChat />
    </div>
  );
}
