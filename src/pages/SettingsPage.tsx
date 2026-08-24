import { useState, useEffect } from 'react';
import type { ColumnDef } from '../types';
import type { ExportFormat } from '../types';
import { getSettings } from '../services/appSettingsService';
import DisplaySettings from '../components/settings/DisplaySettings';
import DataManagement from '../components/settings/DataManagement';
import EmailSettings from '../components/settings/EmailSettings';
import GoalsSettings from '../components/settings/GoalsSettings';
import SupportTicketsSettings from '../components/settings/SupportTicketsSettings';
import LinksSettings from '../components/settings/LinksSettings';
import AgendaSettings from '../components/settings/AgendaSettings';
import AccountSettings from '../components/settings/AccountSettings';
import AlertsManager from '../components/settings/AlertsManager';
import WhatsAppClientToggle from '../components/settings/WhatsAppClientToggle';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

type Tab = 'display' | 'data' | 'links' | 'agenda' | 'email' | 'goals' | 'support' | 'cuenta';

// Una sola lista: estaba repetida en el estado inicial y en el listener del
// hash, y anadir una pestaña obligaba a acordarse de las dos.
const TABS: Tab[] = ['display', 'data', 'links', 'agenda', 'email', 'goals', 'support', 'cuenta'];

function tabDesdeHash(hash: string): Tab | null {
  const limpio = hash.replace('#', '');
  return (TABS as string[]).includes(limpio) ? (limpio as Tab) : null;
}


export default function SettingsPage({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const [tab, setTab] = useState<Tab>(() => tabDesdeHash(window.location.hash) ?? 'display');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    getSettings().then((s) => {
      setExportFormat(s.exportFormat);
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const siguiente = tabDesdeHash(window.location.hash);
      if (siguiente) setTab(siguiente);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="space-y-4">

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
            <AlertsManager />
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
          <LinksSettings />
        )}

        {tab === 'agenda' && (
          <AgendaSettings />
        )}
        
        {tab === 'goals' && (
          <GoalsSettings />
        )}

        {tab === 'cuenta' && (
          <AccountSettings />
        )}

        {tab === 'support' && (
          <SupportTicketsSettings />
        )}
      </div>
    </div>
  );
}
