import { useMemo, useState } from 'react';
import type { Feature, Plan, PlanFeature } from '../../types';
import { Badge, Checkbox, Input, ListPanel, ListRow } from '../../design';
import AdminSkeleton from './AdminSkeleton';
import { CATEGORIAS, type CategoriaDeFuncionalidad } from '../../config/featureCategories';
import { buscarFuncionalidades } from '../../utils/buscarFuncionalidad';

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
  const [busqueda, setBusqueda] = useState('');
  const incluidas = planFeatures.length;
  const asignadas = useMemo(
    () => new Set(planFeatures.map((pf) => pf.feature_id)),
    [planFeatures],
  );

  /*
   * AGRUPADO POR CATEGORIA, IGUAL QUE EL CATALOGO.
   *
   * Componer un plan es responder "de Mensajes, ¿que le doy?", y con una lista
   * plana de cuarenta y tres eso no se puede hacer. Cada grupo dice ademas
   * cuantas lleva incluidas, que es lo que se mira al comparar dos planes.
   */
  const porCategoria = useMemo(() => {
    const visibles = buscarFuncionalidades(features, busqueda);
    const grupos: Array<{ categoria: CategoriaDeFuncionalidad; funcionalidades: Feature[] }> =
      CATEGORIAS.map((categoria) => ({
      categoria,
      funcionalidades: visibles
        .filter((f) => f.category === categoria.id)
        .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100)),
      })).filter((g) => g.funcionalidades.length > 0);

    const sinClasificar = visibles.filter(
      (f) => !f.category || !CATEGORIAS.some((c) => c.id === f.category),
    );
    if (sinClasificar.length > 0) {
      grupos.push({
        categoria: { id: '', nombre: 'Sin clasificar', resumen: '' },
        funcionalidades: sinClasificar,
      });
    }
    return grupos;
  }, [features, busqueda]);

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
            {/* Buscar tambien aqui: componer un plan es ir marcando, y con 44
                funcionalidades encontrar la que buscas por scroll es lo que
                hace que se marque la de al lado por error. */}
            <div className="sticky top-0 z-20 border-b border-line bg-surface px-2 py-1.5">
              <Input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por nombre, clave o categoría…"
                aria-label="Buscar funcionalidad en el plan"
              />
            </div>

            {porCategoria.map(({ categoria, funcionalidades }) => {
              const dentro = funcionalidades.filter((f) => asignadas.has(f.id)).length;
              return (
                <div key={categoria.id || 'sin-clasificar'}>
                  <div className="sticky top-0 z-10 flex items-baseline justify-between gap-2 border-b border-line bg-surface-muted px-3 py-1">
                    <span className="truncate text-micro font-semibold uppercase tracking-wide text-ink-secondary">
                      {categoria.nombre}
                    </span>
                    <span className="shrink-0 text-micro tabular-nums text-ink-muted">
                      {dentro} de {funcionalidades.length}
                    </span>
                  </div>

                  {funcionalidades.map((feature) => {
                    const asignada = asignadas.has(feature.id);
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
                        {!feature.is_active && <Badge tone="danger">Off</Badge>}
                      </ListRow>
                    );
                  })}
                </div>
              );
            })}
          </ListPanel>
        )}
      </div>
    </div>
  );
}
