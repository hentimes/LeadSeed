import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onNavigateSettings: () => void;
}

export default function UserMenu({ isOpen, onClose, onOpenProfile, onNavigateSettings }: Props) {
  const { signOut, user, profile } = useAuth();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute top-[56px] right-4 w-56 bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-md shadow-[0_16px_40px_rgba(17,24,39,0.14)] z-50 overflow-hidden animate-fade-in origin-top-right">
        <div className="px-4 py-3 border-b border-line dark:border-slate-800">
          <p className="text-sm font-semibold text-ink dark:text-white truncate">
            {profile?.full_name || user?.user_metadata?.full_name || 'Usuario'}
          </p>
          <p className="text-xs text-ink-muted dark:text-slate-400 truncate mt-0.5">
            {user?.email}
          </p>
        </div>
        
        <div className="py-1">
          <button 
            onClick={() => { onOpenProfile(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-400 w-4 h-4 flex justify-center items-center"><Icon.User /></span>
            Perfil
          </button>
          
          <button 
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-400 w-4 h-4 flex justify-center items-center"><Icon.Crown /></span>
            Cuenta y plan
          </button>
          
          <button 
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-400 w-4 h-4 flex justify-center items-center">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </span>
            Apariencia
          </button>

          <button 
            onClick={() => { onNavigateSettings(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-400 w-4 h-4 flex justify-center items-center"><Icon.Settings /></span>
            Configuración
          </button>

          <button 
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-400 w-4 h-4 flex justify-center items-center"><Icon.Help /></span>
            Ayuda
          </button>
        </div>

        <div className="py-1 border-t border-line dark:border-slate-800">
          <button 
            onClick={() => { onClose(); signOut(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-state-danger hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <span className="w-4 h-4 flex justify-center items-center"><Icon.Logout /></span>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
