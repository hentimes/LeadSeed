import { useCallback, useEffect, useState } from 'react';
import OnboardingPlanSelect from './components/onboarding/OnboardingPlanSelect';
import type { ColumnDef } from './components/ColumnSelector';
import { useAuth } from './contexts/AuthContext';
import type { Page } from './types';
import AppLayout from './components/layout/AppLayout';
import AppStatusScreen from './components/app/AppStatusScreen';
import AppPageRenderer from './components/app/AppPageRenderer';
import LeadAlertToast from './components/leads/LeadAlertToast';
import { useLeadAlerts } from './hooks/useLeadAlerts';
import { useChatUnread } from './hooks/useChatUnread';
import LoginPage from './pages/LoginPage';
import { useAppKeyboardShortcuts } from './hooks/useAppKeyboardShortcuts';
import { loadAppPreferences, syncSettingsToChromeStorage, updateStoredSettings } from './services/appSettings';
import { DEFAULT_LEAD_COLUMNS } from './config/leadColumns';
import { loadPendingTaskCount, processScheduledEmails, purgeDeletedLeads } from './services/appMaintenance';


export default function App() {
  const { session, profile, loading: authLoading, hasFeature, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('leads');
  const [dbError, setDbError] = useState('');
  const [compactMode, setCompactMode] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [visibleCols, setVisibleCols] = useState<ColumnDef[]>(DEFAULT_LEAD_COLUMNS);
  const [highlightTemplate, setHighlightTemplate] = useState<{ type: 'whatsapp' | 'email' | 'call'; id: number } | null>(null);
  const { alerts: leadAlerts, dismissAlert: dismissLeadAlert } = useLeadAlerts();
  const hasUnreadChat = useChatUnread(page);
  const [pendingCommunityPostId, setPendingCommunityPostId] = useState<string | null>(null);

  // El service worker arranca las alertas al instalarse/iniciar Chrome, pero
  // si el usuario recien inicio sesion todavia no hay suscripcion Realtime.
  useEffect(() => {
    if (!session?.user?.id || !chrome?.runtime?.id) return;
    chrome.runtime.sendMessage({ type: 'LEAD_ALERTS_RESTART' }).catch(() => {});
  }, [session?.user?.id]);

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
      const settings = await loadAppPreferences(DEFAULT_LEAD_COLUMNS);
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

    // El badge lo limpia useLeadAlerts via LEAD_ALERTS_MARK_SEEN, que
    // ademas pone en cero el contador guardado. Borrarlo aca dejaba el
    // estado desincronizado y el badge reaparecia al despertar el worker.
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
    <AppLayout
      currentPage={page}
      onNavigate={setPage}
      taskCount={taskCount}
      hasUnreadChat={hasUnreadChat}
      isAdmin={isAdmin}
    >
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
        pendingCommunityPostId={pendingCommunityPostId}
        onOpenCommunityPost={(postId) => {
          setPendingCommunityPostId(postId);
          setPage('community');
        }}
        onCommunityPostOpened={() => setPendingCommunityPostId(null)}
      />

      <LeadAlertToast
        alerts={leadAlerts}
        onDismiss={dismissLeadAlert}
        onOpenLead={(leadId) => {
          window.location.hash = `#leads?lead=${leadId}`;
          setPage('leads');
        }}
      />
    </AppLayout>
  );
}
