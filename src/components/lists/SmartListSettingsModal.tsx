import React, { useState } from 'react';
import { SMART_LIST_DEFS } from '../../utils/smartLists';

interface Props {
  activeSmartLists: string[];
  onSave: (activeIds: string[]) => void;
  onClose: () => void;
}

export function SmartListSettingsModal({ activeSmartLists, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeSmartLists));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
  };

  // Agrupar por categoría
  const byCategory = SMART_LIST_DEFS.reduce((acc, list) => {
    if (!acc[list.category]) acc[list.category] = [];
    acc[list.category].push(list);
    return acc;
  }, {} as Record<string, typeof SMART_LIST_DEFS>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-card w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-2.5 border-b border-[#E6EAF0] flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-[#161A24] dark:text-slate-200">Configuración de Listas Inteligentes</h2>
          <button onClick={onClose} className="text-[#5B6475] hover:text-[#161A24]">✕</button>
        </div>
        
        <div className="p-3 overflow-y-auto space-y-3 flex-1">
          <p className="text-[11px] text-[#5B6475] mb-2 leading-tight">
            Selecciona qué listas inteligentes quieres ver en tu panel. Estas se actualizan automáticamente.
          </p>
          
          {Object.entries(byCategory).map(([cat, lists]) => (
            <div key={cat} className="space-y-1">
              <h3 className="font-medium text-xs text-[#5B6475] dark:text-slate-400 border-b border-[#E6EAF0] pb-0.5">{cat}</h3>
              <div className="grid grid-cols-2 gap-1">
                {lists.map(l => (
                  <label key={l.id} className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <input 
                      type="checkbox" 
                      checked={selected.has(l.id)} 
                      onChange={() => toggle(l.id)}
                      className="rounded border-[#E6EAF0] text-[#6C4CF6] focus:ring-[#6C4CF6] w-3 h-3"
                    />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }}></span>
                    <span className="text-[11px] font-medium text-[#161A24] dark:text-slate-300">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-3 py-2 border-t border-[#E6EAF0] bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary btn-sm">Guardar Configuración</button>
        </div>
      </div>
    </div>
  );
}
