import { Icon } from '../../utils/icons';
import type { Feature, Plan, PlanFeature, Profile, UserFeatureOverride } from '../../types';
import { formatearFecha } from '../../utils/date';

interface Props {
  selectedUser: Profile;
  plans: Plan[];
  features: Feature[];
  planFeatures: PlanFeature[];
  userOverrides: UserFeatureOverride[];
  onUpdatePlan: (planId: string) => void;
  onAssignFeature: (featureId: string, days?: number) => void;
  onRemoveFeature: (featureId: string) => void;
}

export default function AdminUserLicenses({
  selectedUser,
  plans,
  features,
  planFeatures,
  userOverrides,
  onUpdatePlan,
  onAssignFeature,
  onRemoveFeature,
}: Props) {
  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <span className="text-blue-500">{Icon.Settings()}</span> Perfil Base (Plan)
        </h3>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900">
          <select
            value={selectedUser.plan_id || ''}
            onChange={(e) => onUpdatePlan(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:w-1/2 sm:text-sm dark:border-slate-600/50"
          >
            <option value="">Seleccionar un Plan...</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            El usuario hereda todas las funcionalidades incluidas en este plan.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <span className="text-green-500">{Icon.Tasks()}</span> Sobreescrituras y Promociones
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Añade accesos extra a funcionalidades que no están en su plan, o asigna días de prueba.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const isIncludedByPlan = planFeatures.some((planFeature) => planFeature.feature_id === feature.id);
            const override = userOverrides.find((userOverride) => userOverride.feature_id === feature.id);
            const hasOverride = !!override;
            const isTrial = hasOverride && !!override.expires_at;
            const isAssigned = isIncludedByPlan || hasOverride;

            const cardTone = isTrial
              ? 'border-amber-300 bg-amber-50'
              : isIncludedByPlan
                ? 'border-blue-300 bg-blue-50'
                : hasOverride
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-200 dark:border-slate-700/50 hover:border-blue-300 transition-colors';

            return (
              <div key={feature.id} className={`flex flex-col justify-between rounded-lg border p-4 ${cardTone}`}>
                <div>
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{feature.name}</h4>
                    {isAssigned ? (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isTrial
                            ? 'bg-amber-200 text-amber-800'
                            : isIncludedByPlan
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-green-200 text-green-800'
                        }`}
                      >
                        {isTrial ? 'TRIAL ACTIVO' : isIncludedByPlan ? 'INCLUIDO EN PLAN' : 'ASIGNADO'}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-400 dark:text-slate-500">
                    {feature.description || 'Sin descripción'}
                  </p>

                  {isTrial ? (
                    <p className="mt-2 text-xs font-medium text-amber-600">
                      Expira: {formatearFecha(override.expires_at)}
                    </p>
                  ) : null}

                  {isIncludedByPlan && !hasOverride ? (
                    <p className="mt-2 text-xs font-medium text-blue-600">Heredado desde el plan base del usuario.</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {hasOverride ? (
                    <button
                      onClick={() => onRemoveFeature(feature.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Revocar acceso
                    </button>
                  ) : isIncludedByPlan ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Se gestiona desde el editor del plan.
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => onAssignFeature(feature.id)}
                        className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
                      >
                        Asignar Permanente
                      </button>
                      <button
                        onClick={() => onAssignFeature(feature.id, 15)}
                        className="rounded border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-200"
                      >
                        Dar 15 Días
                      </button>
                      <button
                        onClick={() => onAssignFeature(feature.id, 30)}
                        className="rounded border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm transition-colors hover:bg-sky-200"
                      >
                        Dar 30 Días
                      </button>
                      <button
                        onClick={() => onAssignFeature(feature.id, 60)}
                        className="rounded border border-indigo-200 bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-800 shadow-sm transition-colors hover:bg-indigo-200"
                      >
                        Dar 60 Días
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
