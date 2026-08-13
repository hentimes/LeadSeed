import { useState } from 'react';
import { SMART_LIST_DEFS } from '../../utils/smartLists';
import { Button, Modal } from '../../design';

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
    // Se toma la referencia una vez, en vez de comprobar que existe y volver a
    // buscarla en la linea siguiente.
    const delGrupo = acc[list.category] ?? [];
    delGrupo.push(list);
    acc[list.category] = delGrupo;
    return acc;
  }, {} as Record<string, typeof SMART_LIST_DEFS>);

  return (
    <Modal onClose={onClose} maxWidth="512px" label="Configuracion de listas inteligentes">
        <div className="px-4 py-2.5 border-b border-line flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-ink dark:text-slate-200">Configuración de Listas Inteligentes</h2>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink">✕</button>
        </div>
        
        <div className="p-3 overflow-y-auto space-y-3 flex-1">
          <p className="text-[11px] text-ink-secondary mb-2 leading-tight">
            Selecciona qué listas inteligentes quieres ver en tu panel. Estas se actualizan automáticamente.
          </p>
          
          {Object.entries(byCategory).map(([cat, lists]) => (
            <div key={cat} className="space-y-1">
              <h3 className="font-medium text-xs text-ink-secondary dark:text-slate-400 border-b border-line pb-0.5">{cat}</h3>
              <div className="grid grid-cols-2 gap-1">
                {lists.map(l => (
                  <label key={l.id} className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <input 
                      type="checkbox" 
                      checked={selected.has(l.id)} 
                      onChange={() => toggle(l.id)}
                      className="rounded border-line text-primary focus:ring-primary w-3 h-3"
                    />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }}></span>
                    <span className="text-[11px] font-medium text-ink dark:text-slate-300">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-3 py-2 border-t border-line bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
          <Button size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Guardar Configuración</Button>
        </div>
    </Modal>
  );
}
