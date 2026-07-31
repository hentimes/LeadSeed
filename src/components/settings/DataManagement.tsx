import React, { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../../utils/backup';
import { useDuplicates } from '../../hooks/useDuplicates';
import { getSettings, saveSettings } from '../../services/appSettingsService';
import type { ExportFormat } from '../../types';
import { Icon } from '../../utils/icons';
import ImportModal from '../leads/ImportModal';
import { fetchActiveLeads } from '../../services/leadsService';

import { exportToJSON, exportToExcel } from '../../utils/exportData';
import { useLeads } from '../../hooks/useLeads';
import type { ParsedRow } from '../../utils/importParser';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
}

export default function DataManagement({ exportFormat, onExportFormatChange }: Props) {
  const [restoreMsg, setRestoreMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [existingRuts, setExistingRuts] = useState<Set<string>>(new Set());
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { duplicates, mergeMsg, findDuplicates, mergeLeads } = useDuplicates();
  const { importLeads } = useLeads();

  const handleOpenImport = async () => {
    if (!user) return;
    const allLeads = await fetchActiveLeads(user.id);
    const ruts = new Set<string>();
    const phones = new Set<string>();
    for (const l of allLeads) {
      if (l.rut) ruts.add(l.rut);
      if (l.phone) phones.add(l.phone.replace(/[^+\d]/g, ''));
    }
    setExistingRuts(ruts);
    setExistingPhones(phones);
    setShowImport(true);
  };

  const handleImport = async (rows: ParsedRow[]) => {
    await importLeads(rows.map((row) => ({ ...row, score: 0 })));
    alert('Leads importados correctamente.');
  };

  const handleExportLeads = async () => {
    if (!user) return;
    const allLeads = await fetchActiveLeads(user.id);
    if (exportFormat === 'excel') exportToExcel(allLeads);
    else exportToJSON(allLeads);
  };

  const handleExportFormatChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fmt = e.target.value as ExportFormat;
    onExportFormatChange(fmt);
    try { chrome.storage.sync.set({ exportFormat: fmt }); } catch { /* noop */ }
    const current = await getSettings();
    await saveSettings({ ...current, exportFormat: fmt });
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restaurar respaldo? Se perderan todos los datos actuales y se reemplazaran con los del archivo.')) return;
    try {
      const msg = await importBackup(file);
      setRestoreMsg(msg);
      setTimeout(() => setRestoreMsg(''), 5000);
      window.location.reload();
    } catch (err) {
      setRestoreMsg(err instanceof Error ? err.message : 'Error al restaurar');
      setTimeout(() => setRestoreMsg(''), 5000);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-fade-in pt-2 flex flex-col gap-6">
      {/* Exportar */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-2">Exportación y Respaldo</h3>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Formato de Exportación por defecto</label>
          <select
            value={exportFormat}
            onChange={handleExportFormatChange}
            className="border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
          >
            <option value="json">JSON (Para desarrolladores / migraciones)</option>
            <option value="excel">Excel (.xlsx) (Para uso general)</option>
          </select>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Respaldo Completo</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            Descarga o restaura una copia exacta de toda tu base de datos (leads, listas, plantillas, historiales).
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={exportBackup}
              className="bg-gray-100 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-2"
            >
              <Icon.Download /> Descargar Respaldo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors shadow-sm flex items-center gap-2"
            >
              <Icon.Upload /> Restaurar Respaldo
            </button>
          </div>
          {restoreMsg && <p className={`mt-3 text-sm font-medium ${restoreMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{restoreMsg}</p>}
        </div>
      </div>

      {/* Importar y Exportar Leads */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-2">Importar y Exportar Leads</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Añade nuevos leads desde un archivo Excel/CSV o exporta tu lista actual de contactos de forma individual.
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          <button
            onClick={handleExportLeads}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Icon.Download /> Exportar Leads
          </button>
          <button
            onClick={handleOpenImport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Icon.Upload /> Importar Leads
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          existingRuts={existingRuts}
          existingPhones={existingPhones}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Importar */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-2">Gestión de Duplicados</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Nuestra herramienta busca leads que compartan el mismo RUT o Número de Teléfono para fusionarlos y mantener tu base de datos limpia.
        </p>
        <button 
          onClick={findDuplicates} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm mb-4 flex items-center gap-2"
        >
          <Icon.Search /> Buscar leads duplicados
        </button>
        
        {mergeMsg && <div className="mb-4 text-sm text-green-600 font-medium bg-green-50 p-2 rounded">{mergeMsg}</div>}
        
        {duplicates.length > 0 && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {duplicates.map((d, i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{d.lead1.name}</span>
                    <span className="bg-gray-200 text-slate-500 dark:text-slate-400 px-1.5 rounded text-xs">Principal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500 dark:text-slate-400">{d.lead2.name}</span>
                    <span className="text-blue-600 text-xs font-medium">({d.reason})</span>
                  </div>
                </div>
                <button 
                  onClick={() => { if (confirm(`Unir los datos de ${d.lead2.name} en ${d.lead1.name}?`)) mergeLeads(d.lead1, d.lead2); }}
                  className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-300 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded shadow-sm text-sm font-medium hover:bg-slate-50 dark:bg-slate-900 transition-colors shrink-0"
                >
                  Unir leads
                </button>
              </div>
            ))}
          </div>
        )}
        
        {duplicates.length === 0 && mergeMsg && (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-lg">No se encontraron más duplicados.</p>
        )}
      </div>
    </div>
  );
}
