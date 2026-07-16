import { useState, useEffect } from 'react';
import type { ColumnDef } from '../components/ColumnSelector';
import type { ExportFormat } from '../types';
import { getSettings } from '../db/database';
import DisplaySettings from '../components/settings/DisplaySettings';
import DataManagement from '../components/settings/DataManagement';
import EmailSettings from '../components/settings/EmailSettings';
import GoalsSettings from '../components/settings/GoalsSettings';
import SupportTicketsSettings from '../components/settings/SupportTicketsSettings';
import { Icon } from '../utils/icons';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

type Tab = 'display' | 'data' | 'email' | 'goals' | 'support';

export default function SettingsPage({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const [tab, setTab] = useState<Tab>('display');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    getSettings().then((s) => {
      setExportFormat(s.exportFormat);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">Ajustes</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Configura la extensión, gestiona tus datos y conecta proveedores.</p>
      </div>

      {/* Tabs - Header Style */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/50 mb-6 px-2 gap-6">
        <button
          onClick={() => setTab('display')}
          className={`pb-2.5 px-1 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'display' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Palette /> Apariencia
        </button>
        <button
          onClick={() => setTab('data')}
          className={`pb-2.5 px-1 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'data' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Database /> Datos
        </button>
        <button
          onClick={() => setTab('email')}
          className={`pb-2.5 px-1 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'email' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Email /> Email
        </button>
        <button
          onClick={() => setTab('goals')}
          className={`pb-2.5 px-1 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'goals' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Bullseye /> Metas
        </button>
        <button
          onClick={() => setTab('support')}
          className={`pb-2.5 px-1 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'support' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Messages /> Ayuda VIP
        </button>
      </div>

      {/* Content */}
      <div className="transition-all duration-300">
        {tab === 'display' && (
          <DisplaySettings 
            compactMode={compactMode}
            onCompactModeChange={onCompactModeChange}
            darkMode={darkMode}
            onDarkModeChange={onDarkModeChange}
            visibleCols={visibleCols}
            onColsChange={onColsChange}
          />
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
