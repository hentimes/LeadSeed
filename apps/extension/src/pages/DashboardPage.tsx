import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSettings } from '../services/appSettingsService';
import { fetchDashboardSnapshot, type DashboardSnapshot } from '../services/dashboardService';
import type { AppSettings, Page } from '../types';


// Tabs modulares
import OverviewTab from './dashboard/OverviewTab';
import PipelineTab from './dashboard/PipelineTab';
import TasksTab from './dashboard/TasksTab';
import DashboardTabs, { type DashboardTab } from './dashboard/DashboardTabs';
import PipelineReport from '../components/dashboard/PipelineReport';
import FunnelReport from '../components/dashboard/FunnelReport';
import { Button } from '../design';
import { formatearFechaLarga } from '../utils/date';

export default function DashboardPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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
      <div className="flex w-full flex-col pb-6 animate-pulse">
         <div className="h-8 bg-surface-sunken w-1/3 rounded mb-2"></div>
         <div className="h-4 bg-surface-sunken w-1/2 rounded mb-6"></div>
         <div className="h-64 bg-surface-hover rounded-[14px]"></div>
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
        <DashboardTabs activeTab={activeTab} onSelect={(tab) => { setActiveTab(tab); setReportType(null); }} />
        
        {/* Date Picker (Mock) */}
        <div className="shrink-0 pb-2">
          <Button
            size="sm"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
          >
            <span className="hidden panel-md:inline">Hoy, {formatearFechaLarga(new Date())}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-secondary ml-1"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </Button>
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
