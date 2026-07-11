import React from 'react';
import type { ColumnDef } from '../../components/ColumnSelector';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

export default function DisplaySettings({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const toggleCol = (key: string) => {
    onColsChange(visibleCols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Apariencia y Visualización</h3>
      
      <div className="space-y-6">
        <label className="flex items-center justify-between py-2 border-b border-gray-50">
          <div>
            <span className="text-sm font-medium text-gray-700 block">Modo compacto</span>
            <span className="text-xs text-gray-500">Reduce el espaciado en las tablas para ver más datos</span>
          </div>
          <input type="checkbox" checked={compactMode} onChange={(e) => onCompactModeChange(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
        </label>

        <label className="flex items-center justify-between py-2 border-b border-gray-50">
          <div>
            <span className="text-sm font-medium text-gray-700 block">Modo oscuro</span>
            <span className="text-xs text-gray-500">Aplica un tema oscuro a toda la aplicación (Próximamente completo)</span>
          </div>
          <input type="checkbox" checked={darkMode} onChange={(e) => onDarkModeChange(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
        </label>

        <div className="pt-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Columnas visibles en la tabla principal:</p>
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2">
            {visibleCols.filter((c) => c.key !== 'name').map((col) => (
              <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">La columna "Nombre" siempre permanecerá visible.</p>
        </div>
      </div>
    </div>
  );
}
