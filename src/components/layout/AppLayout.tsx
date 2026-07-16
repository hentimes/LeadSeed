import { ReactNode, useState } from 'react';
import SidebarNav from '../SidebarNav';
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

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
          {children}
        </div>
      </main>
      <SidebarNav currentPage={currentPage} onNavigate={onNavigate} taskCount={taskCount} isAdmin={isAdmin} onOpenProfile={() => setIsProfileModalOpen(true)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      {/* Ventana de soporte asíncrona/flotante */}
      <SupportFloatingChat />
    </div>
  );
}
