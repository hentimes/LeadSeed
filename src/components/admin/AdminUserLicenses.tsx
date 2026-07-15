import React from 'react';
import { Icon } from '../../utils/icons';
import type { Profile, Plan, UserFeatureOverride, Feature } from '../../types';

interface Props {
  selectedUser: Profile;
  plans: Plan[];
  features: Feature[];
  userOverrides: UserFeatureOverride[];
  onUpdatePlan: (planId: string) => void;
  onAssignFeature: (featureId: string, days?: number) => void;
  onRemoveFeature: (featureId: string) => void;
}

export default function AdminUserLicenses({
  selectedUser, plans, features, userOverrides, onUpdatePlan, onAssignFeature, onRemoveFeature
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Asignación de Plan */}
      <section>
        <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-500">{Icon.Settings()}</span> Perfil Base (Plan)
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <select 
            value={selectedUser.plan_id || ''} 
            onChange={(e) => onUpdatePlan(e.target.value)}
            className="w-full sm:w-1/2 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Seleccionar un Plan...</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">El usuario heredará todas las funcionalidades incluidas en este plan.</p>
        </div>
      </section>

      {/* Asignación Manual / Trials */}
      <section>
        <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="text-green-500">{Icon.Tasks()}</span> Sobreescrituras y Promociones
        </h3>
        <p className="text-sm text-gray-600 mb-4">Añade accesos extra a funcionalidades que no están en su plan, o asigna días de prueba.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(f => {
            const override = userOverrides.find(o => o.feature_id === f.id);
            const isAssigned = !!override;
            const isTrial = isAssigned && !!override.expires_at;
            
            return (
              <div key={f.id} className={`border rounded-lg p-4 flex flex-col justify-between ${isAssigned ? (isTrial ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50') : 'border-gray-200 hover:border-blue-300 transition-colors'}`}>
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-gray-900">{f.name}</h4>
                    {isAssigned && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isTrial ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                        {isTrial ? 'TRIAL ACTIVO' : 'ASIGNADO'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{f.description || 'Sin descripción'}</p>
                  
                  {isTrial && (
                    <p className="text-xs font-medium text-amber-600 mt-2">
                      Expira: {new Date(override.expires_at!).toLocaleDateString('es-CL')}
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAssigned ? (
                    <button onClick={() => onRemoveFeature(f.id)} className="text-xs text-red-600 font-medium hover:underline">Revocar acceso</button>
                  ) : (
                    <>
                      <button onClick={() => onAssignFeature(f.id)} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 shadow-sm transition-colors">
                        Asignar Permanente
                      </button>
                      <button onClick={() => onAssignFeature(f.id, 15)} className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded hover:bg-amber-200 shadow-sm transition-colors">
                        Dar 15 Días (Trial)
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
