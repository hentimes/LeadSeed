import { useEffect, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Feature } from '../../types';
import { Modal } from '../../design';

export default function AdminFeaturesPage() {
  const { getFeatures, saveFeature } = useSaaS();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState<Partial<Feature> | null>(null);

  const loadData = async () => {
    setLoading(true);
    const f = await getFeatures();
    setFeatures(f);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature || !editingFeature.name) return;
    
    // Si trial_days viene vacío o nulo, forzamos a 0
    const payload = {
      ...editingFeature,
      trial_days: editingFeature.trial_days || 0,
      is_active: editingFeature.is_active ?? true,
    };

    const saved = await saveFeature(payload);
    
    if (editingFeature.id) {
      setFeatures(features.map(f => f.id === saved.id ? saved : f));
    } else {
      setFeatures([...features, saved]);
    }
    
    setEditingFeature(null);
  };

  if (loading) return <div className="p-8 text-center text-ink-muted">Cargando funcionalidades...</div>;

  return (
    <div className="flex flex-col h-full bg-surface dark:backdrop-blur-md border border-line rounded-xl shadow-sm">
      <div className="p-6 border-b border-line bg-surface-muted flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-ink">Catálogo de Funcionalidades</h2>
          <p className="text-sm text-ink-muted mt-1">Administra las características del sistema y promociones globales (Trials).</p>
        </div>
        <button 
          onClick={() => setEditingFeature({ name: '', description: '', trial_days: 0, is_active: true })} 
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 shadow-sm transition-colors"
        >
          + Nueva Funcionalidad
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.id} className="border border-line rounded-xl p-5 hover:border-line-strong transition-colors bg-surface dark:backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-ink">{f.name}</h3>
                  <div className="flex gap-2">
                    {!f.is_active && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">INACTIVO</span>}
                    {f.trial_days > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">TRIAL {f.trial_days} DÍAS</span>}
                  </div>
                </div>
                <p className="text-sm text-ink-muted mb-4">{f.description || 'Sin descripción'}</p>
              </div>
              <div className="flex justify-end border-t border-line pt-3">
                <button 
                  onClick={() => setEditingFeature(f)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingFeature && (
        <Modal
          onClose={() => setEditingFeature(null)}
          maxWidth="512px"
          label={`${editingFeature.id ? 'Editar' : 'Nueva'} funcionalidad`}
        >
            <div className="p-6 border-b border-line">
              <h3 className="text-xl font-bold text-ink">{editingFeature.id ? 'Editar' : 'Nueva'} Funcionalidad</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Código de Funcionalidad (name)</label>
                <input 
                  type="text" 
                  required 
                  value={editingFeature.name || ''} 
                  onChange={e => setEditingFeature({...editingFeature, name: e.target.value})} 
                  className="w-full border border-line-strong rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="ej. envios_masivos_whatsapp" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Descripción</label>
                <textarea 
                  value={editingFeature.description || ''} 
                  onChange={e => setEditingFeature({...editingFeature, description: e.target.value})} 
                  className="w-full border border-line-strong rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Permite enviar..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Días de Prueba Gratis (Trial Global)</label>
                <input 
                  type="number" 
                  min="0"
                  value={editingFeature.trial_days || 0} 
                  onChange={e => setEditingFeature({...editingFeature, trial_days: parseInt(e.target.value) || 0})} 
                  className="w-full border border-line-strong rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <p className="text-xs text-ink-muted mt-1">Si es mayor a 0, cualquier usuario sin plan premium podrá activar una prueba temporal de esta función.</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={editingFeature.is_active !== false} 
                  onChange={e => setEditingFeature({...editingFeature, is_active: e.target.checked})} 
                  className="w-4 h-4 text-blue-600 rounded border-line-strong focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-ink-secondary">Funcionalidad Activa</label>
              </div>
              
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingFeature(null)} className="px-5 py-2.5 text-sm font-medium text-ink-secondary hover:text-ink transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Guardar</button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
