import React, { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../../utils/backup';
import { useDuplicates } from '../../hooks/useDuplicates';
import { getSettings, saveSettings } from '../../db/database';
import type { ExportFormat } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
}

export default function DataManagement({ exportFormat, onExportFormatChange }: Props) {
  const [restoreMsg, setRestoreMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { duplicates, mergeMsg, findDuplicates, mergeLeads } = useDuplicates();

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
    if (!confirm('¿Restaurar respaldo? Se perderán todos los datos actuales y se reemplazarán con los del archivo.')) return;
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
        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Exportación y Respaldo</h3>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Exportación por defecto</label>
          <select
            value={exportFormat}
            onChange={handleExportFormatChange}
            className="border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
          >
            <option value="json">JSON (Para desarrolladores / migraciones)</option>
            <option value="excel">Excel (.xlsx) (Para uso general)</option>
          </select>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Respaldo Completo</h4>
          <p className="text-xs text-gray-500 mb-3">
            Descarga o restaura una copia exacta de toda tu base de datos (leads, listas, plantillas, historiales).
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={exportBackup}
              className="bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-2"
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

      {/* Importar */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Gestión de Duplicados</h3>
        <p className="text-sm text-gray-600 mb-4">
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
              <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{d.lead1.name}</span>
                    <span className="bg-gray-200 text-gray-600 px-1.5 rounded text-xs">Principal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">{d.lead2.name}</span>
                    <span className="text-blue-600 text-xs font-medium">({d.reason})</span>
                  </div>
                </div>
                <button 
                  onClick={() => { if (confirm(`¿Unir los datos de ${d.lead2.name} en ${d.lead1.name}?`)) mergeLeads(d.lead1, d.lead2); }}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
                >
                  Unir leads
                </button>
              </div>
            ))}
          </div>
        )}
        
        {duplicates.length === 0 && mergeMsg && (
          <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">No se encontraron más duplicados.</p>
        )}
      </div>
    </div>
  );
}
