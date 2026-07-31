import { useState, useEffect } from 'react';
import type { ColumnDef } from '../components/ColumnSelector';
import type { ExportFormat } from '../types';
import { getSettings } from '../services/appSettingsService';
import DisplaySettings from '../components/settings/DisplaySettings';
import DataManagement from '../components/settings/DataManagement';
import EmailSettings from '../components/settings/EmailSettings';
import GoalsSettings from '../components/settings/GoalsSettings';
import SupportTicketsSettings from '../components/settings/SupportTicketsSettings';
import CaptureLinksSettings from '../components/settings/CaptureLinksSettings';
import AgendaSettings from '../components/settings/AgendaSettings';
import WhatsAppClientToggle from '../components/settings/WhatsAppClientToggle';
import { Icon } from '../utils/icons';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

type Tab = 'display' | 'data' | 'links' | 'agenda' | 'email' | 'goals' | 'support';


export default function SettingsPage({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.replace('#', '');
    return (['display', 'data', 'links', 'agenda', 'email', 'goals', 'support'].includes(hash)) ? hash as Tab : 'display';
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    getSettings().then((s) => {
      setExportFormat(s.exportFormat);
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['display', 'data', 'links', 'agenda', 'email', 'goals', 'support'].includes(hash)) {
        setTab(hash as Tab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Content */}
      <div className="transition-all duration-300">
        {tab === 'display' && (
          <div className="space-y-4">
            <DisplaySettings 
              compactMode={compactMode}
              onCompactModeChange={onCompactModeChange}
              darkMode={darkMode}
              onDarkModeChange={onDarkModeChange}
              visibleCols={visibleCols}
              onColsChange={onColsChange}
            />
            <WhatsAppClientToggle />
          </div>
        )}
        
        {tab === 'data' && (
          <DataManagement 
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
          />
        )}
        
        {tab === 'email' && (
          <EmailSettings />
        )}

        {tab === 'links' && (
          <CaptureLinksSettings />
        )}

        {tab === 'agenda' && (
          <AgendaSettings />
        )}
        
        {tab === 'goals' && (
          <GoalsSettings />
        )}

        {tab === 'support' && (
          <SupportTicketsSettings />
        )}
      </div>
    </div>
  );
}
