import type { Feature, Plan, PlanFeature, Profile, UserFeatureOverride } from '../../types';
import { Badge, Block, Button, Field, Select } from '../../design';
import { formatearFecha } from '../../utils/date';

/** Los tres regalos de prueba que ya existian, en un solo sitio. */
const DIAS_DE_PRUEBA = [15, 30, 60];

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

/**
 * "Que puede hacer este usuario": su plan y sus permisos sueltos.
 *
 * El contenido es el mismo de antes. Lo que cambia es el color: la vista
 * pintaba cuatro estados con cuatro paletas escritas a mano -ambar para el
 * trial, azul para lo heredado del plan, verde para lo asignado a mano, gris
 * para lo que no tiene- y ninguna salia de las fichas del producto, asi que en
 * modo oscuro quedaban tarjetas de fondo claro con texto claro encima.
 *
 * Ahora los cuatro estados usan los tonos de `Badge`, que tienen version
 * oscura, y el estado se dice con la etiqueta en vez de con el fondo entero.
 */
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
    <div className="space-y-4">
      <Block title="Plan base">
        <Field hint="El usuario hereda todas las funcionalidades incluidas en este plan.">
          <Select value={selectedUser.plan_id || ''} onChange={(event) => onUpdatePlan(event.target.value)}>
            <option value="">Sin plan asignado</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </Field>
      </Block>

      <Block title="Permisos y promociones" count={`${features.length} funcionalidades`}>
        <ul className="space-y-1.5">
          {features.map((feature) => {
            const vieneDelPlan = planFeatures.some((planFeature) => planFeature.feature_id === feature.id);
            const override = userOverrides.find((userOverride) => userOverride.feature_id === feature.id);
            const esPrueba = !!override?.expires_at;

            return (
              <li key={feature.id} className="rounded-md border border-line p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-micro font-semibold text-ink">{feature.name}</p>
                    <p className="line-clamp-2 text-micro text-ink-muted">
                      {feature.description || 'Sin descripción'}
                    </p>
                  </div>
                  {esPrueba ? (
                    <Badge tone="warning">Prueba</Badge>
                  ) : vieneDelPlan ? (
                    <Badge tone="primary">Del plan</Badge>
                  ) : override ? (
                    <Badge tone="success">Asignado</Badge>
                  ) : null}
                </div>

                {esPrueba && (
                  <p className="mt-1 text-micro text-state-warning">
                    Expira el {formatearFecha(override?.expires_at)}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {override ? (
                    <Button size="sm" variant="ghost-danger" onClick={() => onRemoveFeature(feature.id)}>
                      Revocar
                    </Button>
                  ) : vieneDelPlan ? (
                    <span className="text-micro text-ink-muted">Se gestiona desde el plan.</span>
                  ) : (
                    <>
                      <Button size="sm" variant="primary" onClick={() => onAssignFeature(feature.id)}>
                        Asignar
                      </Button>
                      {DIAS_DE_PRUEBA.map((dias) => (
                        <Button key={dias} size="sm" onClick={() => onAssignFeature(feature.id, dias)}>
                          {dias} días
                        </Button>
                      ))}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Block>
    </div>
  );
}
