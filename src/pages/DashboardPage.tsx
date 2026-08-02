import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSettings } from '../services/appSettingsService';
import { fetchDashboardSnapshot, type DashboardSnapshot } from '../services/dashboardService';
import type { AppSettings, Page } from '../types';


// Tabs modulares
import OverviewTab from './dashboard/OverviewTab';
import PipelineTab from './dashboard/PipelineTab';
import TasksTab from './dashboard/TasksTab';
import PipelineReport from '../components/dashboard/PipelineReport';
import FunnelReport from '../components/dashboard/FunnelReport';

type TabType = 'overview' | 'pipeline' | 'tasks';

export default function DashboardPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reportType, setReportType] = useState<'acquisition' | 'funnel' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const nextSettings = await getSettings();
      if (cancelled) return;
      setSettings(nextSettings);

      if (!user) {
        setSnapshot(null);
        return;
      }

      const nextSnapshot = await fetchDashboardSnapshot(nextSettings.dashboardComparePeriod);
      if (!cancelled) setSnapshot(nextSnapshot);
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (!settings || !snapshot) {
    // Skeleton genérico simple
    return (
      <div className="flex w-full flex-col px-4 pb-6 animate-pulse">
         <div className="h-8 bg-slate-200 w-1/3 rounded mb-2"></div>
         <div className="h-4 bg-slate-200 w-1/2 rounded mb-6"></div>
         <div className="h-64 bg-slate-100 rounded-[14px]"></div>
      </div>
    );
  }

  let compareLabel = 'vs ayer';
  if (settings.dashboardComparePeriod === 'lastWeek') compareLabel = 'vs sem. pasada';
  else if (settings.dashboardComparePeriod === 'lastMonth') compareLabel = 'vs mes pasado';
  else if (settings.dashboardComparePeriod === 'lastYear') compareLabel = 'vs año pasado';

  return (
    <div className="flex w-full flex-col">
      
      {/* Navegación de Tabs Sticky y Date Picker */}
      <div className="flex w-full mb-3 border-b border-line justify-between items-end pb-1">
        <div className="flex gap-2 w-1/2">
          <button
            onClick={() => { setActiveTab('overview'); setReportType(null); }}
            className={`flex-1 flex justify-center pb-3 text-[14px] font-medium items-center gap-2 transition-all border-b-[2px] -mb-[5px] ${
              activeTab === 'overview'
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Overview
        </button>
        <button
          onClick={() => { setActiveTab('pipeline'); setReportType(null); }}
          className={`flex-1 flex justify-center pb-3 text-[14px] font-medium items-center gap-2 transition-all border-b-[2px] -mb-[5px] ${
            activeTab === 'pipeline'
              ? 'border-primary text-ink'
              : 'border-transparent text-ink-secondary hover:text-ink'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Pipeline
        </button>
        <button
          onClick={() => { setActiveTab('tasks'); setReportType(null); }}
          className={`flex-1 flex justify-center pb-3 text-[14px] font-medium items-center gap-2 transition-all border-b-[2px] -mb-[5px] ${
            activeTab === 'tasks'
              ? 'border-primary text-ink'
              : 'border-transparent text-ink-secondary hover:text-ink'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Tareas
        </button>
        </div>
        
        {/* Date Picker (Mock) */}
        <div className="pb-2">
          <button className="btn btn-secondary btn-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Hoy, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-secondary ml-1"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
      </div>

      {/* Contenido Dinámico Modulizado */}
      <div className="mt-2">
        {reportType === 'acquisition' && (
          <PipelineReport snapshot={snapshot} onClose={() => setReportType(null)} />
        )}
        {reportType === 'funnel' && (
          <FunnelReport snapshot={snapshot} onClose={() => setReportType(null)} />
        )}
        {!reportType && (
          <>
            {activeTab === 'overview' && (
              <OverviewTab 
                snapshot={snapshot} 
                settings={settings} 
                compareLabel={compareLabel} 
                onNavigate={onNavigate} 
              />
            )}
            {activeTab === 'pipeline' && (
              <PipelineTab 
                snapshot={snapshot} 
                onNavigate={onNavigate} 
                onViewReport={(type) => setReportType(type)}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksTab 
                snapshot={snapshot} 
                onNavigate={onNavigate} 
              />
            )}
          </>
        )}
      </div>

    </div>
  );
}
