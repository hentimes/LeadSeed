import { useState, useEffect } from 'react';
import SidebarNav from './components/SidebarNav';
import LeadsPage from './pages/LeadsPage';
import ListsPage from './pages/ListsPage';
import TemplatesPage from './pages/TemplatesPage';
import SendPage from './pages/SendPage';
import SendHistoryPage from './pages/SendHistoryPage';
import TasksPage from './pages/TasksPage';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import CommunityPage from './pages/CommunityPage';
import OnboardingPlanSelect from './components/onboarding/OnboardingPlanSelect';
import { getSettings, saveSettings } from './db/database';
import { supabase } from './lib/supabaseClient';
import { checkTaskNotifications } from './utils/taskNotifications';

import { sendEmailToLeads } from './utils/emailSender';
import type { ColumnDef } from './components/ColumnSelector';
import { useAuth } from './contexts/AuthContext';
import { primaryRoutes, secondaryRoutes } from './config/routes';

import type { Page } from './types';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './pages/admin/AdminLayout';
// Chat flotante temporalmente removido

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
  const { session, user, profile, loading: authLoading, hasFeature, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('leads');
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [compactMode, setCompactMode] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [visibleCols, setVisibleCols] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [highlightTemplate, setHighlightTemplate] = useState<{ type: 'whatsapp' | 'email' | 'call'; id: number } | null>(null);

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPage('leads');
        setTimeout(() => {
          const input = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
          if (input) input.focus();
        }, 100);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setPage('leads'); break;
          case '2': e.preventDefault(); setPage('send'); break;
          case '3': e.preventDefault(); setPage('tasks'); break;
          case '4': e.preventDefault(); setPage('history'); break;
          case '5': e.preventDefault(); setPage('settings'); break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        console.log('App lista');
        // Intentar cargar desde chrome.storage.sync primero, luego IndexedDB
        let settings = await getSettings();
        try {
          const synced = await chrome.storage.sync.get(['compactMode', 'visibleCols', 'exportFormat']);
          if (synced.compactMode !== undefined) settings.compactMode = synced.compactMode;
          if (synced.visibleCols?.length) settings.visibleCols = synced.visibleCols;
          if (synced.exportFormat) settings.exportFormat = synced.exportFormat;
        } catch { /* chrome.storage no disponible en dev */ }
        if (settings.compactMode !== undefined) setCompactMode(settings.compactMode);
        if (settings.darkMode !== undefined) {
          setDarkMode(settings.darkMode);
          document.documentElement.classList.toggle('dark', settings.darkMode);
        }
        if (settings.visibleCols?.length) {
          setVisibleCols(settings.visibleCols.map((c: any) => {
            const def = DEFAULT_COLUMNS.find((d) => d.key === c.key);
            return def ? { ...def, visible: c.visible } : c;
          }));
        }
        setDbReady(true);
        processScheduledEmails();
        loadTaskCount();
        try { chrome.action.setBadgeText({ text: '' }); } catch { /* noop */ }
        purgeTrash();
      } catch (err) {
        console.error('App error', err);
        setDbError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const loadTaskCount = async () => {
    if (!session?.user) return;
    const { data: tasks } = await supabase
      .from('tasks')
      .select('due_date')
      .eq('status', 'pendiente')
      .eq('user_id', session.user.id);
      
    if (tasks) {
      const today = new Date().toISOString().slice(0, 10);
      const count = tasks.filter((t: any) => t.due_date && t.due_date.slice(0, 10) <= today).length;
      setTaskCount(count);
    }
  };

  const purgeTrash = async () => {
    if (!session?.user) return;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    await supabase.from('leads').delete().lt('deleted_at', cutoff).eq('user_id', session.user.id);
  };

  const syncSettings = (updates: Record<string, any>) => {
    try { chrome.storage.sync.set(updates); } catch { /* noop */ }
  };

  const processScheduledEmails = async () => {
    const now = new Date().toISOString();
    
    // 1. Fetch pending emails from Supabase
    const { data: due } = await supabase
      .from('send_logs')
      .select('*')
      .eq('template_type', 'email')
      .lte('scheduled_for', now);
      
    if (!due || due.length === 0) {
      try { chrome.storage.local.set({ hasScheduledEmails: false }); } catch { /* noop */ }
      return;
    }
    
    // Agrupar por templateId
    const grouped = new Map<any, typeof due>();
    for (const log of due) {
      if (!grouped.has(log.template_id)) grouped.set(log.template_id, []);
      grouped.get(log.template_id)!.push(log);
    }
    
    for (const [tplId, logs] of grouped) {
      const { data: template } = await supabase.from('templates').select('*').eq('id', tplId).single();
      if (!template) continue;
      
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .in('id', logs.map((l: any) => l.lead_id));
        
      if (!leads || leads.length === 0) continue;
      
      const validLeads = leads.map(l => ({ ...l, createdAt: l.created_at, updatedAt: l.updated_at, deletedAt: l.deleted_at, listaIds: l.lista_ids || [] }));
      await sendEmailToLeads(validLeads as any, template.subject || '', template.content, template.is_html);
      
      // Actualizar logs: marcar como enviados
      const realNow = new Date().toISOString();
      await supabase.from('send_logs').update({ sent_at: realNow, scheduled_for: null }).in('id', logs.map((l: any) => l.id));
      
      // Marcar leads como contactados en Supabase
      await supabase.from('leads').update({ status: 'contactado' }).in('id', leads.map(l => l.id));
    }
    try { chrome.storage.local.set({ hasScheduledEmails: false }); } catch { /* noop */ }
  };

  const handleCompactModeChange = (v: boolean) => {
    setCompactMode(v);
    syncSettings({ compactMode: v });
    getSettings().then((s) => saveSettings({ ...s, compactMode: v }));
  };

  const handleColsChange = (cols: ColumnDef[]) => {
    setVisibleCols(cols);
    syncSettings({ visibleCols: cols });
    getSettings().then((s) => saveSettings({ ...s, visibleCols: cols }));
  };

  const handleDarkModeChange = (v: boolean) => {
    setDarkMode(v);
    document.documentElement.classList.toggle('dark', v);
    syncSettings({ darkMode: v });
    getSettings().then((s) => saveSettings({ ...s, darkMode: v }));
  };

  if (dbError) {
    return <div className="p-8 bg-red-50 h-screen"><h1 className="text-red-700 font-bold text-lg mb-2">Error de base de datos</h1><p className="text-red-600 text-sm">{dbError}</p></div>;
  }
  
  if (!dbReady || authLoading) {
    return <div className="p-8 bg-slate-50 dark:bg-slate-900 h-screen flex items-center justify-center"><p className="text-slate-400 dark:text-slate-500">Inicializando...</p></div>;
  }

  const needsOnboarding = session && profile && !profile.plan_id && !isAdmin;

  if (!session) {
    return <LoginPage />;
  }

  if (needsOnboarding) {
    return <OnboardingPlanSelect />;
  }

  const renderPage = () => {
    const routeDef = [...primaryRoutes, ...secondaryRoutes].find(r => r.page === page);
    if (routeDef?.requiredFeature && !isAdmin && !hasFeature(routeDef.requiredFeature)) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl text-amber-500 mb-4 flex justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Funcionalidad no disponible</h2>
            <p className="text-slate-400 dark:text-slate-500 mt-2">Tu plan actual no incluye acceso a <strong>{routeDef.label}</strong>. Contacta al administrador para mejorar tu plan o solicitar una prueba gratuita.</p>
          </div>
        </div>
      );
    }

    switch (page) {
      case 'leads': return <LeadsPage compactMode={compactMode} visibleCols={visibleCols} />;
      case 'lists': return <ListsPage />;
      case 'templates': return <TemplatesPage highlightTemplate={highlightTemplate} onClearHighlight={() => setHighlightTemplate(null)} />;
      case 'send': return <SendPage />;
      case 'history': return <SendHistoryPage onNavigate={setPage} onViewTemplate={(type, id) => { setHighlightTemplate({ type, id }); setPage('templates'); }} />;
      case 'tasks': return <TasksPage onTasksChanged={loadTaskCount} />;
      case 'dashboard': return <DashboardPage onNavigate={setPage} />;
      case 'pipeline': return <PipelinePage />;
      case 'settings': return <SettingsPage compactMode={compactMode} onCompactModeChange={handleCompactModeChange} darkMode={darkMode} onDarkModeChange={handleDarkModeChange} visibleCols={visibleCols} onColsChange={handleColsChange} />;
      case 'community': return <CommunityPage />;
      case 'admin': return <AdminLayout />;
      default: return <LeadsPage compactMode={compactMode} visibleCols={visibleCols} />;
    }
  };

  return (
    <>
      <AppLayout currentPage={page} onNavigate={setPage} taskCount={taskCount} isAdmin={isAdmin}>
        {renderPage()}
      </AppLayout>
      {/* El chat interno será refactorizado en una sala global posteriormente */}
    </>
  );
}
