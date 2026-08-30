import type { Feature, Plan, PlanFeature } from '../../types';
import { Badge, Checkbox, ListPanel, ListRow } from '../../design';
import AdminSkeleton from './AdminSkeleton';

/**
 * Que funcionalidades trae un plan.
 *
 * Antes eran tarjetas de dos columnas con una casilla dibujada a mano -un
 * `div` con un `svg` de check dentro- que no era un control real: no se podia
 * tabular hasta ella ni activarla con la barra espaciadora, y el lector de
 * pantalla no anunciaba si estaba marcada.
 *
 * Ahora es una lista de casillas de verdad. Ademas la rejilla de dos columnas
 * no llegaba a caber nunca: su punto de corte era `sm:` (640px), y el panel
 * lateral rara vez pasa de 700 contando el rail.
 */
export default function AdminPlanEditor({
  plan,
  features,
  planFeatures,
  isLoading,
  onToggleFeature,
}: {
  plan: Plan;
  features: Feature[];
  planFeatures: PlanFeature[];
  isLoading: boolean;
  onToggleFeature: (featureId: string) => void;
}) {
  const incluidas = planFeatures.length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface">
      <div className="shrink-0 border-b border-line bg-surface-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-card-title font-semibold text-ink">{plan.name}</h3>
          <Badge tone="primary">
            {incluidas} de {features.length}
          </Badge>
        </div>
        <p className="mt-0.5 line-clamp-2 text-micro text-ink-muted">{plan.description || 'Sin descripción'}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <AdminSkeleton rows={4} />
        ) : (
          <ListPanel title="Funcionalidades incluidas" count={`${incluidas} activas`}>
            {features.map((feature) => {
              const asignada = planFeatures.some((planFeature) => planFeature.feature_id === feature.id);
              return (
                <ListRow key={feature.id} density="compact" isSelected={asignada} className="items-start">
                  <Checkbox
                    label={null}
                    aria-label={feature.name}
                    checked={asignada}
                    onChange={() => onToggleFeature(feature.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-micro font-medium text-ink">{feature.name}</p>
                    <p className="line-clamp-2 text-micro text-ink-muted">
                      {feature.description || 'Sin descripción'}
                    </p>
                  </div>
                </ListRow>
              );
            })}
          </ListPanel>
        )}
      </div>
    </div>
  );
}
