import { useEffect, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import type { Plan } from '../../types';
import { saveProfileFields } from '../../services/profileService';

export default function OnboardingPlanSelect() {
  const { getPlans } = useSaaS();
  const { user, refreshProfile, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      const allPlans = await getPlans();
      // Ordenar: Free primero, luego Estandar, luego Pro (o por nombre)
      allPlans.sort((a, b) => {
        if (a.name.toLowerCase().includes('free')) return -1;
        if (b.name.toLowerCase().includes('free')) return 1;
        return a.name.localeCompare(b.name);
      });
      setPlans(allPlans);
      setLoading(false);
    };
    loadPlans();
  }, [getPlans]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;
    setSelectingId(plan.id);
    try {
      await saveProfileFields(user.id, { plan_id: plan.id });

      // Refrescar el perfil en el contexto para que App.tsx nos deje pasar
      await refreshProfile();
    } catch (err) {
      console.error('Error al seleccionar plan:', err);
      alert('Hubo un error al asignar el plan. Por favor intenta nuevamente.');
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 flex-col gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 dark:text-slate-500 font-medium">Cargando planes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-10 px-4">
      
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Bienvenido a PlanesPro</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Para comenzar, elige el plan que mejor se adapte a tus necesidades de ventas.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {plans.map((plan) => {
          const isFree = plan.name.toLowerCase().includes('free') || plan.name.toLowerCase().includes('gratis');
          // Según el requerimiento, solo el Free está habilitado por ahora
          const isEnabled = isFree;
          const isSelecting = selectingId === plan.id;

          return (
            <div 
              key={plan.id}
              onClick={() => isEnabled && !isSelecting ? handleSelectPlan(plan) : null}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all p-5 
                ${isEnabled 
                  ? 'border-blue-500 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md shadow-md cursor-pointer hover:border-blue-600 hover:shadow-lg' 
                  : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-80'}`}
            >
              {!isEnabled && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gray-200 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                    Próximamente
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                  {isFree ? Icon.Leads() : Icon.Dashboard()}
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${isEnabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mt-1 leading-relaxed ${isEnabled ? 'text-slate-500 dark:text-slate-400' : 'text-gray-400'}`}>
                    {plan.description || (isFree ? 'Acceso básico al CRM con límite de 100 prospectos y 10 correos diarios.' : 'Funcionalidades avanzadas y límites extendidos.')}
                  </p>
                  
                  {isEnabled && (
                    <button 
                      disabled={isSelecting}
                      className="mt-4 w-full bg-blue-600 text-white font-medium py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
                    >
                      {isSelecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Iniciando...
                        </>
                      ) : (
                        'Comenzar Gratis'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {plans.length === 0 && (
          <div className="text-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600/50 rounded-xl">
            <p className="text-slate-400 dark:text-slate-500 text-sm">No hay planes configurados en el sistema.</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button onClick={signOut} className="text-sm text-gray-400 hover:text-slate-500 dark:text-slate-400 font-medium underline">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
