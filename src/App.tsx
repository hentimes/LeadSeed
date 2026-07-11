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
import { db, getSettings, saveSettings } from './db/database';
import { checkTaskNotifications } from './utils/taskNotifications';
import { seedTemplatesIfEmpty } from './utils/seedTemplates';
import { sendEmailToLeads } from './utils/emailSender';
import type { ColumnDef } from './components/ColumnSelector';

import type { Page } from './types';
import AppLayout from './components/layout/AppLayout';

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
    db.open()
      .then(async () => {
        console.log('DB lista');
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
        seedTemplatesIfEmpty();
        processScheduledEmails();
        loadTaskCount();
        // Limpiar badge al abrir
        try { chrome.action.setBadgeText({ text: '' }); } catch { /* noop */ }
        purgeTrash();
      })
      .catch((err) => { console.error('DB error', err); setDbError(err instanceof Error ? err.message : String(err)); });
  }, []);

  const loadTaskCount = async () => {
    const tasks = await db.tasks.where('status').equals('pendiente').toArray();
    const today = new Date().toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) <= today).length;
    setTaskCount(count);
  };

  const purgeTrash = async () => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const old = await db.leads.filter((l) => !!(l.deletedAt && l.deletedAt < cutoff)).toArray();
    for (const l of old) await db.leads.delete(l.id!);
  };

  const syncSettings = (updates: Record<string, any>) => {
    try { chrome.storage.sync.set(updates); } catch { /* noop */ }
  };

  const processScheduledEmails = async () => {
    const now = new Date().toISOString();
    const pending = await db.sendLog.toArray();
    const due = pending.filter((l) => l.scheduledFor && l.scheduledFor <= now);
    const toSend = due.filter((l) => l.templateType === 'email');
    if (toSend.length === 0) {
      try { chrome.storage.local.set({ hasScheduledEmails: false }); } catch { /* noop */ }
      return;
    }
    // Agrupar por templateId
    const grouped = new Map<number, typeof toSend>();
    for (const log of toSend) {
      if (!grouped.has(log.templateId)) grouped.set(log.templateId, []);
      grouped.get(log.templateId)!.push(log);
    }
    for (const [tplId, logs] of grouped) {
      const template = await db.emailTemplates.get(tplId);
      if (!template) continue;
      const leads = await db.leads.bulkGet(logs.map((l) => l.leadId));
      const validLeads = leads.filter((l): l is NonNullable<typeof l> => l != null);
      if (validLeads.length === 0) continue;
      await sendEmailToLeads(validLeads, template.asunto, template.contenido, template.isHtml);
      // Actualizar logs: marcar como enviados
      const realNow = new Date().toISOString();
      for (const log of logs) {
        await db.sendLog.update(log.id!, { sentAt: realNow, scheduledFor: undefined });
      }
      // Marcar leads como contactados
      for (const l of validLeads) {
        await db.leads.update(l.id!, { status: 'contactado' });
      }
    }
    try { chrome.storage.local.set({ hasScheduledEmails: due.length > toSend.length }); } catch { /* noop */ }
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
  if (!dbReady) {
    return <div className="p-8 bg-gray-50 h-screen flex items-center justify-center"><p className="text-gray-500">Inicializando...</p></div>;
  }

  const renderPage = () => {
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
      default: return <LeadsPage compactMode={compactMode} visibleCols={visibleCols} />;
    }
  };

  return (
    <AppLayout currentPage={page} onNavigate={setPage} taskCount={taskCount}>
      {renderPage()}
    </AppLayout>
  );
}
