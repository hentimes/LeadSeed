import { useEffect, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Feature, Plan, PlanFeature } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';
import { Badge, Button, EmptyState, Field, Input, ListPanel, ListRow, Modal, Notice, Textarea } from '../../design';
import LoadingOverlay from '../../components/LoadingOverlay';
import AdminMasterDetail from '../../components/admin/AdminMasterDetail';
import AdminPlanEditor from '../../components/admin/AdminPlanEditor';
import AdminFeatureEditor from '../../components/admin/AdminFeatureEditor';

const iconoCatalogo = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

type Seleccion = { tipo: 'plan'; id: string } | { tipo: 'feature'; id: string | null } | null;

/**
 * El catalogo: planes y funcionalidades, en una sola pantalla.
 *
 * Eran dos secciones de primer nivel. La cadena real es una sola -una
 * funcionalidad existe, un plan la incluye, un usuario la tiene por su plan o
 * por un permiso suelto- y estaba repartida en tres pantallas que no se veian
 * entre si. Crear una funcionalidad y meterla en un plan obligaba a cambiar de
 * pestana, perder la lista y volver.
 *
 * Aqui las dos listas viven en la columna izquierda, una encima de la otra, y
 * comparten el mismo panel de detalle. La funcionalidad recien creada aparece
 * en el editor del plan sin cambiar de sitio.
 */
export default function AdminCatalogPage() {
  const {
    getPlans,
    getFeatures,
    getPlanFeatures,
    createPlan,
    assignFeatureToPlan,
    removeFeatureFromPlan,
    saveFeature,
  } = useSaaS();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [error, setError] = useState('');

  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [nuevoPlan, setNuevoPlan] = useState<{ nombre: string; descripcion: string } | null>(null);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
        const [pl, f] = await Promise.all([getPlans(), getFeatures()]);
        setPlans(pl);
        setFeatures(f);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'No se pudo cargar el catálogo'));
      } finally {
        setLoading(false);
      }
    };

    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirPlan = async (plan: Plan) => {
    setSeleccion({ tipo: 'plan', id: plan.id });
    setPlanFeatures([]);
    setCargandoPlan(true);
    try {
      setPlanFeatures(await getPlanFeatures(plan.id));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudieron cargar las funcionalidades del plan'));
    } finally {
      setCargandoPlan(false);
    }
  };

  const alternarFuncionalidad = async (planId: string, featureId: string) => {
    const asignada = planFeatures.some((planFeature) => planFeature.feature_id === featureId);

    // Se pinta el resultado antes de que responda el servidor y se deshace si
    // falla: una casilla que tarda medio segundo en marcarse invita a pulsarla
    // dos veces, y la segunda deshacia la primera.
    setPlanFeatures((actuales) =>
      asignada
        ? actuales.filter((planFeature) => planFeature.feature_id !== featureId)
        : [...actuales, { plan_id: planId, feature_id: featureId }],
    );

    try {
      if (asignada) await removeFeatureFromPlan(planId, featureId);
      else await assignFeatureToPlan(planId, featureId);
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, 'No se pudo actualizar el plan'));
      setPlanFeatures(await getPlanFeatures(planId));
    }
  };

  const crearPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nuevoPlan?.nombre.trim()) return;

    setGuardandoPlan(true);
    setError('');
    try {
      const plan = await createPlan({
        name: nuevoPlan.nombre,
        description: nuevoPlan.descripcion,
        is_active: true,
      });
      setPlans((prev) => [...prev, plan]);
      setNuevoPlan(null);
      await abrirPlan(plan);
    } catch (createError) {
      setError(getErrorMessage(createError, 'No se pudo crear el plan'));
    } finally {
      setGuardandoPlan(false);
    }
  };

  const guardarFuncionalidad = async (borrador: Partial<Feature>) => {
    const guardada = await saveFeature(borrador);
    setFeatures((prev) =>
      borrador.id ? prev.map((f) => (f.id === guardada.id ? guardada : f)) : [...prev, guardada],
    );
    setSeleccion({ tipo: 'feature', id: guardada.id });
  };

  if (loading) return <LoadingOverlay message="Cargando catálogo..." />;

  const planActivo = seleccion?.tipo === 'plan' ? plans.find((plan) => plan.id === seleccion.id) : undefined;
  const featureActiva =
    seleccion?.tipo === 'feature' && seleccion.id ? features.find((f) => f.id === seleccion.id) : undefined;

  const lista = (
    <div className="flex min-h-0 flex-col gap-2">
      {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}

      <ListPanel
        title="Planes"
        count={plans.length}
        maxHeight="max-h-[40vh]"
        headerActions={
          <Button size="sm" variant="ghost" onClick={() => setNuevoPlan({ nombre: '', descripcion: '' })}>
            + Plan
          </Button>
        }
        empty={<EmptyState title="Sin planes" description="Crea el primero para poder asignarlo." />}
      >
        {plans.length === 0
          ? null
          : plans.map((plan) => (
              <ListRow
                key={plan.id}
                density="compact"
                isSelected={seleccion?.tipo === 'plan' && seleccion.id === plan.id}
                onClick={() => void abrirPlan(plan)}
                className="cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-micro font-semibold text-ink">{plan.name}</p>
                  <p className="truncate text-micro text-ink-muted">{plan.description || 'Sin descripción'}</p>
                </div>
              </ListRow>
            ))}
      </ListPanel>

      <ListPanel
        title="Funcionalidades"
        count={features.length}
        className="min-h-0 flex-1"
        headerActions={
          <Button size="sm" variant="ghost" onClick={() => setSeleccion({ tipo: 'feature', id: null })}>
            + Función
          </Button>
        }
        empty={<EmptyState title="Sin funcionalidades" description="El catálogo está vacío." />}
      >
        {features.length === 0
          ? null
          : features.map((feature) => (
              <ListRow
                key={feature.id}
                density="compact"
                isSelected={seleccion?.tipo === 'feature' && seleccion.id === feature.id}
                onClick={() => setSeleccion({ tipo: 'feature', id: feature.id })}
                className="cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-micro font-semibold text-ink">{feature.name}</p>
                  <p className="truncate text-micro text-ink-muted">{feature.description || 'Sin descripción'}</p>
                </div>
                {!feature.is_active && <Badge tone="danger">Off</Badge>}
                {feature.trial_days > 0 && <Badge tone="warning">{feature.trial_days} d</Badge>}
              </ListRow>
            ))}
      </ListPanel>
    </div>
  );

  let detalle: React.ReactNode = null;
  if (planActivo) {
    detalle = (
      <AdminPlanEditor
        plan={planActivo}
        features={features}
        planFeatures={planFeatures}
        isLoading={cargandoPlan}
        onToggleFeature={(featureId) => void alternarFuncionalidad(planActivo.id, featureId)}
      />
    );
  } else if (seleccion?.tipo === 'feature') {
    detalle = (
      <AdminFeatureEditor
        key={featureActiva?.id ?? 'nueva'}
        feature={featureActiva ?? { name: '', description: '', trial_days: 0, is_active: true }}
        onSave={guardarFuncionalidad}
        onCancel={() => setSeleccion(null)}
      />
    );
  }

  return (
    <>
      <AdminMasterDetail
        listLabel="Catálogo"
        list={lista}
        detail={detalle}
        onBack={() => setSeleccion(null)}
        emptyDetail={
          <div className="flex w-full items-center justify-center rounded-md border border-dashed border-line-strong">
            <EmptyState
              icon={iconoCatalogo}
              title="Nada abierto"
              description="Elige un plan para componerlo, o una funcionalidad para editarla."
            />
          </div>
        }
      />

      {nuevoPlan && (
        <Modal onClose={() => setNuevoPlan(null)} maxWidth="420px" label="Nuevo plan">
          <form onSubmit={crearPlan} className="space-y-3 p-4">
            <h3 className="text-card-title font-semibold text-ink">Nuevo plan</h3>

            <Field label="Nombre">
              <Input
                required
                value={nuevoPlan.nombre}
                onChange={(event) => setNuevoPlan({ ...nuevoPlan, nombre: event.target.value })}
                placeholder="Ej. Pro Anual"
              />
            </Field>

            <Field label="Descripción">
              <Textarea
                rows={3}
                value={nuevoPlan.descripcion}
                onChange={(event) => setNuevoPlan({ ...nuevoPlan, descripcion: event.target.value })}
                placeholder="Qué incluye este plan..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setNuevoPlan(null)} disabled={guardandoPlan}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={guardandoPlan || !nuevoPlan.nombre.trim()}>
                {guardandoPlan ? 'Creando...' : 'Crear plan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
