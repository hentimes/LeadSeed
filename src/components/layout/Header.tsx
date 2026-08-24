import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import type { Page } from '../../types';

interface Props {
  onToggleUserMenu: () => void;
  currentPage: Page;
}

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Panel Analítico',
  leads: 'Gestión de Leads',
  lists: 'Listas y Cargas',
  templates: 'Plantillas de Mensaje',
  flows: 'Flujos de Mensajes',
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

export default function Header({ onToggleUserMenu, currentPage }: Props) {
  const { user, profile } = useAuth();
  const pageTitle = PAGE_TITLES[currentPage];

  return (
    <header className="h-[64px] shrink-0 bg-surface dark:bg-slate-900 border-b border-line dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-30 relative">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {pageTitle ? (
            <span className="truncate text-section-title font-semibold text-ink tracking-tight">
              {pageTitle}
            </span>
          ) : (
            <>
              <div className="text-primary w-6 h-6 flex items-center justify-center">
                {Icon.Leads()}
              </div>
              <span className="font-bold text-ink text-lg tracking-tight">LeadSeed</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones / Ayuda (Opcional) */}
        <button type="button" aria-label="Ayuda" className="p-2 text-ink-muted hover:text-ink-secondary transition-colors">
          <Icon.Help />
        </button>

        {/* Avatar */}
        <button
          onClick={onToggleUserMenu}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-transform hover:scale-105"
        >
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <img 
              src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-line object-cover" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-bold border border-line">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
