import { ReactNode } from 'react';
import SidebarNav from '../SidebarNav';
import type { Page } from '../../types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  children: ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, taskCount, children }: Props) {
  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
          {children}
        </div>
      </main>
      <SidebarNav currentPage={currentPage} onNavigate={onNavigate} taskCount={taskCount} />
    </div>
  );
}
