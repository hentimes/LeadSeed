import { useState, useEffect } from 'react';
import type { ColumnDef } from '../components/ColumnSelector';
import type { ExportFormat } from '../types';
import { getSettings } from '../db/database';
import DisplaySettings from '../components/settings/DisplaySettings';
import DataManagement from '../components/settings/DataManagement';
import EmailSettings from '../components/settings/EmailSettings';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

type Tab = 'display' | 'data' | 'email';

export default function SettingsPage({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const [tab, setTab] = useState<Tab>('display');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    getSettings().then((s) => {
      setExportFormat(s.exportFormat);
    });
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Ajustes</h2>
        <p className="text-sm text-gray-500 mt-1">Configura la extensión, gestiona tus datos y conecta proveedores.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100/80 rounded-lg p-1.5 mb-6 shadow-sm border border-gray-200/50">
        <button
          onClick={() => setTab('display')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'display' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🎨 Apariencia
        </button>
        <button
          onClick={() => setTab('data')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'data' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          💾 Datos y Respaldo
        </button>
        <button
          onClick={() => setTab('email')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'email' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          ✉️ Email
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
      </div>
    </div>
  );
}
