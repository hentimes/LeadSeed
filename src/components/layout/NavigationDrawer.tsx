import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { primaryRoutes, secondaryRoutes, RouteDef } from '../../config/routes';
import type { Page } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  hasUnreadChat?: boolean;
}

export default function NavigationDrawer({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  taskCount,
  hasUnreadChat,
}: Props) {
  const { hasFeature } = useAuth();
  
  // Estado para submenús
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'settings': false,
    'messages': false
  });

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  if (!isOpen) return null;

  // Custom categories based on new layout
  const categorizedRoutes: Record<string, RouteDef[]> = {
    'Principal': [],
    'Colaboración': [],
    'Analítica': [],
    'Sistema': []
  };

  [...primaryRoutes, ...secondaryRoutes].forEach(route => {
    if (['dashboard', 'leads', 'lists'].includes(route.page)) {
      categorizedRoutes['Principal'].push(route);
    } else if (['chat', 'community'].includes(route.page)) {
      categorizedRoutes['Colaboración'].push(route);
    } else if (['pipeline', 'history', 'tasks', 'agenda'].includes(route.page)) {
      categorizedRoutes['Analítica'].push(route);
    } else if (['admin'].includes(route.page)) {
      categorizedRoutes['Sistema'].push(route);
    }
  });

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  const renderNavButton = (
    page: Page,
    label: string,
    icon: any,
    badge?: number,
    isSubItem = false,
    hash?: string,
    dot = false
  ) => {
    const isActive = currentPage === page && (!hash || window.location.hash === hash);
    return (
      <button
        key={`${page}-${label}`}
        onClick={() => {
          if (hash) window.location.hash = hash;
          handleNavigate(page);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-primary-soft dark:bg-slate-800 text-primary dark:text-white' 
            : 'text-ink-muted dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-200'
        } ${isSubItem ? 'pl-9 text-[13px]' : ''}`}
      >
        {!isSubItem && (
          <span className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-primary' : 'text-slate-400'}`}>
            {icon()}
          </span>
        )}
        {isSubItem && (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-1"></span>
        )}
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {dot && (!badge || badge <= 0) && (
          <span
            className="ml-auto w-2 h-2 rounded-full bg-red-500"
            aria-label="Mensajes sin leer"
          />
        )}
      </button>
    );
  };

  /** Cada seccion decide su indicador: numero para tareas, punto para chat. */
  const renderRoutes = (routes: RouteDef[]) =>
    routes.map(({ page, label, icon, badge }) =>
      renderNavButton(
        page,
        label,
        icon,
        badge && page === 'tasks' ? taskCount : 0,
        false,
        undefined,
        page === 'chat' && !!hasUnreadChat
      )
    );

  const renderSubmenu = (id: string, label: string, icon: any, items: {page: Page, label: string, hash?: string}[]) => {
    const isOpen = openSubmenus[id];
    const isAnyActive = items.some(item => currentPage === item.page && (!item.hash || window.location.hash === item.hash));
    
    return (
      <div key={id} className="flex flex-col">
        <button
          onClick={() => toggleSubmenu(id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
            isAnyActive 
              ? 'text-primary dark:text-white' 
              : 'text-ink-muted dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className={`w-5 h-5 flex items-center justify-center ${isAnyActive ? 'text-primary' : 'text-slate-400'}`}>
            {icon()}
          </span>
          {label}
          <span className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            {Icon.ChevronDown()}
          </span>
        </button>
        
        {isOpen && (
          <div className="flex flex-col gap-0.5 mt-1 animate-slide-up">
            {items.map(item => renderNavButton(item.page, item.label, null, 0, true, item.hash))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />
      
      <aside 
        className="absolute top-[60px] left-2 sm:left-4 w-60 bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-md rounded-tl-none z-40 flex flex-col shadow-[var(--ls-shadow-float,0_16px_40px_rgba(17,24,39,0.14))] animate-fade-in origin-top-left overflow-hidden max-h-[calc(100vh-80px)]"
      >
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {Object.entries(categorizedRoutes).map(([category, routes]) => {
            const visibleRoutes = routes.filter(r => !r.requiredFeature || hasFeature(r.requiredFeature));
            
            return (
              <div key={category}>
                <h3 className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-ink-muted uppercase opacity-70">
                  {category}
                </h3>
                <nav className="space-y-0.5">
                  {category === 'Principal' && (
                    <>
                      {renderRoutes(visibleRoutes)}
                      {renderSubmenu('messages', 'Mensajes', Icon.Messages, [
                        { page: 'send', label: 'Enviar' },
                        { page: 'templates', label: 'Plantillas' }
                      ])}
                    </>
                  )}

                  {category === 'Colaboración' && renderRoutes(visibleRoutes)}

                  {category === 'Analítica' && renderRoutes(visibleRoutes)}

                  {category === 'Sistema' && (
                    <>
                      {renderSubmenu('settings', 'Ajustes', Icon.Settings, [
                        { page: 'settings', label: 'Apariencia', hash: '#display' },
                        { page: 'settings', label: 'Datos', hash: '#data' },
                        { page: 'settings', label: 'Email', hash: '#email' },
                        { page: 'settings', label: 'Links', hash: '#links' },
                        { page: 'settings', label: 'Config agenda', hash: '#agenda' },
                        { page: 'settings', label: 'Metas', hash: '#goals' },
                        { page: 'settings', label: 'Ayuda VIP', hash: '#support' }
                      ])}
                      {hasFeature('module:admin') && renderNavButton('admin', 'Admin SaaS', Icon.Admin)}
                    </>
                  )}
                </nav>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
