import { useCallback, useEffect, useState } from 'react';
import OnboardingPlanSelect from './components/onboarding/OnboardingPlanSelect';
import type { ColumnDef } from './components/ColumnSelector';
import { useAuth } from './contexts/AuthContext';
import type { Page } from './types';
import AppLayout from './components/layout/AppLayout';
import AppStatusScreen from './components/app/AppStatusScreen';
import AppPageRenderer from './components/app/AppPageRenderer';
import LoginPage from './pages/LoginPage';
import { useAppKeyboardShortcuts } from './hooks/useAppKeyboardShortcuts';
import { loadAppPreferences, syncSettingsToChromeStorage, updateStoredSettings } from './services/appSettings';
import { loadPendingTaskCount, processScheduledEmails, purgeDeletedLeads } from './services/appMaintenance';

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Nombre', visible: true },
  { key: 'phone', label: 'Teléfono', visible: true },
  { key: 'email', label: 'Email', visible: true },
  { key: 'company', label: 'Empresa', visible: true },
  { key: 'rut', label: 'RUT', visible: true },
  { key: 'createdAt', label: 'Ingreso', visible: true },
  { key: 'lists', label: 'Listas', visible: true },
  { key: 'status', label: 'Estado', visible: true },
  { key: 'score', label: 'Score', visible: false },
];

export default function App() {
  const { session, profile, loading: authLoading, hasFeature, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('leads');
  const [dbError, setDbError] = useState('');
  const [compactMode, setCompactMode] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [visibleCols, setVisibleCols] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [highlightTemplate, setHighlightTemplate] = useState<{ type: 'whatsapp' | 'email' | 'call'; id: number } | null>(null);

  useAppKeyboardShortcuts({ onNavigate: setPage });

  const refreshTaskCount = useCallback(async () => {
    if (!session?.user) {
      setTaskCount(0);
      return;
    }

    const count = await loadPendingTaskCount(session.user.id);
    setTaskCount(count);
  }, [session?.user]);

  const initializeShell = useCallback(async () => {
    try {
      const settings = await loadAppPreferences(DEFAULT_COLUMNS);
      setCompactMode(settings.compactMode);
      setDarkMode(settings.darkMode);
      document.documentElement.classList.toggle('dark', settings.darkMode);
      setVisibleCols(settings.visibleCols);
      setDbError('');
    } catch (error) {
      console.error('App error', error);
      setDbError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void initializeShell();
  }, [initializeShell]);

  useEffect(() => {
    if (!session?.user) {
      setTaskCount(0);
      return;
    }

    void refreshTaskCount();
    void purgeDeletedLeads(session.user.id).catch((error) => {
      console.warn('No se pudo purgar leads eliminados:', error);
    });
    void processScheduledEmails().catch((error) => {
      console.warn('No se pudieron procesar correos programados:', error);
    });

    try {
      chrome.action.setBadgeText({ text: '' });
    } catch {
      // noop
    }
  }, [refreshTaskCount, session?.user]);

  useEffect(() => {
    const refreshShellCounters = () => {
      if (document.visibilityState === 'visible' && session?.user) {
        void refreshTaskCount();
      }
    };

    document.addEventListener('visibilitychange', refreshShellCounters);
    window.addEventListener('focus', refreshShellCounters);

    return () => {
      document.removeEventListener('visibilitychange', refreshShellCounters);
      window.removeEventListener('focus', refreshShellCounters);
    };
  }, [refreshTaskCount, session?.user]);

  const handleCompactModeChange = (value: boolean) => {
    setCompactMode(value);
    syncSettingsToChromeStorage({ compactMode: value });
    void updateStoredSettings({ compactMode: value });
  };

  const handleColsChange = (cols: ColumnDef[]) => {
    setVisibleCols(cols);
    syncSettingsToChromeStorage({ visibleCols: cols });
    void updateStoredSettings({ visibleCols: cols });
  };

  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
    document.documentElement.classList.toggle('dark', value);
    syncSettingsToChromeStorage({ darkMode: value });
    void updateStoredSettings({ darkMode: value });
  };

  if (dbError) {
    return <AppStatusScreen tone="error" title="Error de base de datos" description={dbError} />;
  }

  if (authLoading) {
    return <AppStatusScreen title="Inicializando..." />;
  }

  if (!session) {
    return <LoginPage />;
  }

  const needsOnboarding = !!profile && !profile.plan_id && !isAdmin;
  if (needsOnboarding) {
    return <OnboardingPlanSelect />;
  }

  return (
    <>
      <AppLayout currentPage={page} onNavigate={setPage} taskCount={taskCount} isAdmin={isAdmin}>
        <AppPageRenderer
          page={page}
          compactMode={compactMode}
          darkMode={darkMode}
          visibleCols={visibleCols}
          highlightTemplate={highlightTemplate}
          isAdmin={isAdmin}
          hasFeature={hasFeature}
          onNavigate={setPage}
          onTasksChanged={refreshTaskCount}
          onCompactModeChange={handleCompactModeChange}
          onDarkModeChange={handleDarkModeChange}
          onColsChange={handleColsChange}
          onClearHighlightTemplate={() => setHighlightTemplate(null)}
          onHighlightTemplate={(template) => setHighlightTemplate(template)}
        />
      </AppLayout>
    </>
  );
}
