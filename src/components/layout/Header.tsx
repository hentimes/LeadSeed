import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import type { Page } from '../../types';

interface Props {
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onToggleUserMenu: () => void;
  currentPage: Page;
}

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Panel Analítico',
  leads: 'Gestión de Leads',
  lists: 'Listas y Cargas',
  templates: 'Plantillas de Mensaje',
  send: 'Envío Masivo',
  history: 'Historial de Envíos',
  tasks: 'Mis Tareas',
  pipeline: 'Pipeline Comercial',
  agenda: 'Agenda y Citas',
  settings: 'Configuración',
  community: 'Comunidad LeadSeed',
  support: 'Soporte Técnico',
  admin: 'Administración',
  chat: 'Chats Activos',
};

export default function Header({ isDrawerOpen, onToggleDrawer, onToggleUserMenu, currentPage }: Props) {
  const { user, profile } = useAuth();
  const pageTitle = PAGE_TITLES[currentPage];

  return (
    <header className="h-[64px] shrink-0 bg-surface dark:bg-slate-900 border-b border-[var(--ls-border,#E6E8F0)] dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-30 relative">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDrawer}
          className={`p-2 -ml-2 rounded-lg transition-colors focus:outline-none ${
            isDrawerOpen
              ? 'text-[var(--ls-primary,#6C4CF6)] bg-[var(--ls-soft-purple,#F2EEFF)] dark:bg-slate-800'
              : 'text-slate-500 hover:text-[var(--ls-primary,#6C4CF6)] hover:bg-[var(--ls-soft-purple,#F2EEFF)] dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          aria-label={isDrawerOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isDrawerOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <div className="flex items-center gap-2">
          {pageTitle ? (
            <span className="text-section-title font-semibold text-ink tracking-tight ml-2">
              {pageTitle}
            </span>
          ) : (
            <>
              <div className="text-primary w-6 h-6 flex items-center justify-center">
                {Icon.Leads()}
              </div>
              <span className="font-bold text-ink dark:text-white text-lg tracking-tight">LeadSeed</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones / Ayuda (Opcional) */}
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Icon.Help />
        </button>

        {/* Avatar */}
        <button
          onClick={onToggleUserMenu}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ls-primary,#6C4CF6)] focus:ring-offset-1 transition-transform hover:scale-105"
        >
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <img 
              src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--ls-soft-purple,#F2EEFF)] text-[var(--ls-primary,#6C4CF6)] flex items-center justify-center text-sm font-bold border border-[var(--ls-border,#E6E8F0)]">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
