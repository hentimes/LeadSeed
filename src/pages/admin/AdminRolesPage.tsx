import { useEffect, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Plan, Feature, PlanFeature } from '../../types';
import { Icon } from '../../utils/icons';

export default function AdminRolesPage() {
  const { getPlans, getFeatures, getPlanFeatures, createPlan, assignFeatureToPlan, removeFeatureFromPlan } = useSaaS();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [pl, f] = await Promise.all([getPlans(), getFeatures()]);
    setPlans(pl);
    setFeatures(f);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanFeatures([]);
    const pf = await getPlanFeatures(plan.id);
    setPlanFeatures(pf);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    const plan = await createPlan({ name: newPlanName, description: newPlanDesc, is_active: true });
    setPlans([...plans, plan]);
    setShowNewPlan(false);
    setNewPlanName('');
    setNewPlanDesc('');
    handleSelectPlan(plan);
  };

  const handleToggleFeature = async (featureId: string) => {
    if (!selectedPlan) return;
    const isAssigned = planFeatures.some(pf => pf.feature_id === featureId);
    
    if (isAssigned) {
      await removeFeatureFromPlan(selectedPlan.id, featureId);
      setPlanFeatures((current) => current.filter((pf) => pf.feature_id !== featureId));
    } else {
      await assignFeatureToPlan(selectedPlan.id, featureId);
      setPlanFeatures((current) => [...current, { plan_id: selectedPlan.id, feature_id: featureId }]);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 dark:text-slate-500">Cargando perfiles...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de Planes */}
      <div className="w-1/3 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">Perfiles / Planes</h3>
          <button onClick={() => setShowNewPlan(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            + Nuevo
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {plans.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleSelectPlan(p)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedPlan?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 dark:border-slate-700/50 hover:border-blue-300'}`}
            >
              <h4 className="font-bold text-slate-800 dark:text-slate-100">{p.name}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{p.description || 'Sin descripción'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor de Plan */}
      <div className="flex-1 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
        {showNewPlan ? (
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Crear Nuevo Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre del Plan</label>
                <input type="text" required value={newPlanName} onChange={e => setNewPlanName(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600/50 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Ej. Pro Anual" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Descripción</label>
                <textarea value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600/50 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Beneficios del plan..."></textarea>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">Crear Plan</button>
                <button type="button" onClick={() => setShowNewPlan(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 px-4 py-2 text-sm font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        ) : selectedPlan ? (
          <>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedPlan.name}</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{selectedPlan.description}</p>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="text-blue-500">{Icon.Dashboard()}</span> Funcionalidades del Plan
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Selecciona las funcionalidades que vendrán incluidas por defecto para todos los usuarios que tengan este plan asignado.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map(f => {
                  const isAssigned = planFeatures.some(pf => pf.feature_id === f.id);
                  return (
                    <div 
                      key={f.id} 
                      onClick={() => handleToggleFeature(f.id)}
                      className={`border rounded-xl p-4 cursor-pointer flex gap-4 transition-all ${isAssigned ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 dark:border-slate-700/50 hover:border-blue-300 hover:bg-slate-50 dark:bg-slate-900'}`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${isAssigned ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border-slate-300 dark:border-slate-600/50'}`}>
                        {isAssigned && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{f.name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{f.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Selecciona un plan para editar sus funcionalidades
          </div>
        )}
      </div>
    </div>
  );
}
