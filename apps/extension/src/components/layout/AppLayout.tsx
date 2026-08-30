import { ReactNode, useState } from 'react';
import Header from './Header';
import NavigationRail from './NavigationRail';
import UserMenu from './UserMenu';
import ProfileModal from '../profile/ProfileModal';
import type { Page } from '../../types';
import { useTelemetry } from '../../hooks/useTelemetry';
import SupportFloatingChat from '../support/SupportFloatingChat';
import { setLocationHash } from './useLocationHash';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  unreadChatCount?: number;
  isChatBanned?: boolean;
  isAdmin?: boolean;
  children: ReactNode;
}

export default function AppLayout({
  currentPage,
  onNavigate,
  taskCount,
  unreadChatCount,
  isChatBanned,
  children,
}: Props) {
  // Inicializar rastreo de telemetría y presencia global en la app
  useTelemetry(currentPage);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-muted font-sans text-ink">
      <Header
        onToggleUserMenu={() => setIsUserMenuOpen(prev => !prev)}
        currentPage={currentPage}
      />

      <NavigationRail
        currentPage={currentPage}
        onNavigate={onNavigate}
        taskCount={taskCount}
        unreadChatCount={unreadChatCount}
        isChatBanned={isChatBanned}
      />

      <UserMenu
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onNavigateSettings={() => onNavigate('settings')}
      />

      {/*
        El hueco del rail se reserva con padding y no encogiendo el `main`: el
        ancho del contenido tiene que ser el mismo con el menu abierto y
        cerrado. Sale de `--ls-rail-width`, que vale siempre lo que mide el
        rail contraido aunque este abierto.
      */}
      <main className="flex-1 overflow-y-auto relative animate-fade-in z-0 pl-2 pr-[calc(var(--ls-rail-width)+0.5rem)] py-4 w-full min-w-0">
        {children}
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onEditAccount={() => {
          // Las dos cosas, y en este orden, igual que `navegar` en el rail: el
          // hash primero para que Ajustes ya monte en la seccion correcta.
          setLocationHash('#cuenta');
          onNavigate('settings');
          setIsProfileModalOpen(false);
        }}
      />
      <SupportFloatingChat />
    </div>
  );
}
