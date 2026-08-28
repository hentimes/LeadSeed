import { useEffect, useRef, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Feature, Lead, Plan, PlanFeature, Profile, UserFeatureOverride } from '../../types';
import { usePresence } from '../../hooks/usePresence';
import { useAuth } from '../../contexts/AuthContext';
import {
  bulkSetUsersAsHelper,
  loadAdminLeadAlerts,
  loadUnreadCountsForAdmin,
  markAdminUserBaseSeen,
  subscribeAdminUsersRealtime,
} from '../../services/adminService';
import type { AdminLeadEventRow } from '../../repositories/adminRepository';
import { getErrorMessage } from '../../utils/errorMessage';
import { Badge, Button, EmptyState, Input, ListPanel, Notice } from '../../design';
import LoadingOverlay from '../../components/LoadingOverlay';
import AdminMasterDetail from '../../components/admin/AdminMasterDetail';
import AdminUserRow from '../../components/admin/AdminUserRow';
import AdminUserDetail, { type UserSection } from '../../components/admin/AdminUserDetail';
import AdminBulkActionsModal, { type BulkAction } from '../../components/admin/AdminBulkActionsModal';

const iconoUsuarios = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

/**
 * Lista de usuarios y ficha del usuario elegido.
 *
 * ## El error de permisos que traia
 *
 * La linea era `const { session, profile: isAdmin } = useAuth()`: renombraba
 * **el perfil** a `isAdmin`, asi que `isAdmin` era cierto para cualquiera con
 * sesion iniciada. Todas las comprobaciones colgadas de esa variable -las seis
 * pestanas de administrador, el selector de plan, la casilla de seleccion
 * multiple, la base de leads de otro usuario- se cumplian tambien para un
 * helper. `useAuth` expone un `isAdmin` de verdad, que es el que se usa aqui.
 *
 * ## Que se recuerda al cambiar de usuario
 *
 * La seccion abierta, no la del usuario. Antes `handleSelectUser` forzaba la
 * pestana "Base" en cada clic, asi que comparar la telemetria de cinco
 * usuarios seguidos obligaba a volver a elegir la pestana cinco veces. Lo que
 * el admin esta mirando es una propiedad de la sesion, no del usuario.
 */
export default function AdminUsersPage() {
  const {
    getProfiles,
    getPlans,
    getFeatures,
    getPlanFeatures,
    getUserOverrides,
    assignFeatureToUser,
    removeFeatureFromUser,
    updateProfile,
  } = useSaaS();
  const { onlineUsers } = usePresence();
  const { session, isAdmin } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedPlanFeatures, setSelectedPlanFeatures] = useState<PlanFeature[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserFeatureOverride[]>([]);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [openSection, setOpenSection] = useState<UserSection>('licencias');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [leadAlertCounts, setLeadAlertCounts] = useState<Record<string, number>>({});
  const [liveObservedLead, setLiveObservedLead] = useState<Lead | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // La logica de tiempo real necesita saber que hay abierto AHORA, no en el
  // render en que se suscribio. Antes esto apuntaba a la pestana 'base'; ahora
  // apunta a la seccion "Datos", que es donde vive esa lista.
  const openSectionRef = useRef<UserSection>(openSection);
  const selectedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    openSectionRef.current = openSection;
  }, [openSection]);

  useEffect(() => {
    selectedUserIdRef.current = selectedUser?.id ?? null;
  }, [selectedUser]);

  const loadUnreadCounts = async () => {
    if (!session) return;
    setUnreadCounts(await loadUnreadCountsForAdmin(session.user.id));
  };

  const loadLeadAlerts = async () => {
    if (!isAdmin) return;
    const conteos = await loadAdminLeadAlerts();

    /*
     * El usuario cuya seccion "Datos" esta abierta se queda en cero pase lo
     * que pase. Esta consulta puede haber salido ANTES de que
     * `markAdminUserBaseSeen` confirmara en el servidor y llegar despues: sin
     * esto, su respuesta trae el conteo viejo y el aviso resucita un par de
     * segundos justo despues de abrir la ficha, que es cuando el admin
     * acaba de mirarlos.
     */
    const observado = openSectionRef.current === 'datos' ? selectedUserIdRef.current : null;
    setLeadAlertCounts(observado ? { ...conteos, [observado]: 0 } : conteos);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, pl, f] = await Promise.all([getProfiles(), getPlans(), getFeatures()]);
      setProfiles(p);
      setPlans(pl);
      setFeatures(f);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudo cargar la lista de usuarios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;

    void loadData();
    void loadUnreadCounts();
    void loadLeadAlerts();

    return subscribeAdminUsersRealtime(
      session.user.id,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setProfiles((prev) => [payload.new as Profile, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setProfiles((prev) =>
            prev.map((profile) => (profile.id === payload.new.id ? { ...profile, ...payload.new } : profile)),
          );
        }
      },
      () => {
        void loadUnreadCounts();
      },
      (payload) => {
        const leadEvent = payload.new as AdminLeadEventRow;
        const observedUserId = leadEvent.observed_user_id;

        if (!observedUserId) {
          void loadLeadAlerts();
          return;
        }

        const estaMirandoSusDatos =
          openSectionRef.current === 'datos' && selectedUserIdRef.current === observedUserId;

        setLeadAlertCounts((current) => ({
          ...current,
          [observedUserId]: estaMirandoSusDatos ? 0 : (current[observedUserId] || 0) + 1,
        }));

        if (estaMirandoSusDatos) {
          setLiveObservedLead({
            id: leadEvent.lead_id,
            name: 'Nuevo lead',
            phone: '',
            email: '',
            company: '',
            rut: '',
            status: 'nuevo',
            score: 0,
            listaIds: [],
            notes: '',
            metadata: {},
            crossExecAlerts: [],
            hasUnreadCrossExecAlert: false,
            createdAt: leadEvent.created_at,
            updatedAt: leadEvent.created_at,
          });
          setDataRefreshKey((current) => current + 1);
          void markAdminUserBaseSeen(observedUserId).catch(() => undefined);
          return;
        }

        void loadLeadAlerts();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, session]);

  useEffect(() => {
    if (!isAdmin || openSection !== 'datos' || !selectedUser) return;
    let cancelled = false;
    const observedUserId = selectedUser.id;

    void (async () => {
      try {
        await markAdminUserBaseSeen(observedUserId);
        if (!cancelled) setLeadAlertCounts((current) => ({ ...current, [observedUserId]: 0 }));
      } catch {
        // Si falla la marca de visto no se bloquea la vista: el contador
        // volvera a cuadrar en la siguiente carga.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openSection, isAdmin, selectedUser]);

  /**
   * Abrir el chat pone su contador a cero y cierra el aviso de lead en vivo.
   *
   * Va aqui y no en un efecto a proposito: es la consecuencia de un gesto del
   * admin, no la sincronizacion con nada de fuera. Escrito como efecto, React
   * tiene que renderizar una vez con el badge todavia puesto y otra sin el.
   */
  const abrirChat = (abierto: boolean) => {
    setIsChatOpen(abierto);
    setLiveObservedLead(null);
    if (abierto && selectedUser) {
      setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    }
  };

  const abrirSeccion = (section: Exclude<UserSection, null>) => {
    setOpenSection((actual) => (actual === section ? null : section));
    setLiveObservedLead(null);
  };

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    selectedUserIdRef.current = user.id;
    // El helper entra a hablar, no a auditar.
    setIsChatOpen(!isAdmin);
    setLiveObservedLead(null);
    setUnreadCounts((prev) => (isAdmin ? prev : { ...prev, [user.id]: 0 }));
    setUserOverrides([]);
    setSelectedPlanFeatures([]);

    if (!isAdmin) return;

    const [overrides, planFeatures] = await Promise.all([
      getUserOverrides(user.id),
      user.plan_id ? getPlanFeatures(user.plan_id) : Promise.resolve([]),
    ]);

    /*
     * Si mientras se pedian los permisos el admin ya abrio a otro, esta
     * respuesta se tira. Pintarla llenaria "Licencias" con los permisos de un
     * usuario y el nombre de otro, y desde esa misma pantalla se conceden y se
     * revocan: el error no seria de lectura, seria de escritura.
     */
    if (selectedUserIdRef.current !== user.id) return;

    setUserOverrides(overrides);
    setSelectedPlanFeatures(planFeatures);
  };

  const handleBulkAction = async (action: BulkAction) => {
    if (selectedUserIds.length === 0) return;
    const esHelper = action === 'helper';

    setProcesando(true);
    setError('');
    try {
      await bulkSetUsersAsHelper(selectedUserIds, esHelper);
      setProfiles((prev) =>
        prev.map((profile) =>
          selectedUserIds.includes(profile.id) ? { ...profile, is_helper: esHelper } : profile,
        ),
      );
      setSelectedUserIds([]);
      setMostrarAcciones(false);
    } catch (bulkError) {
      setError(getErrorMessage(bulkError, 'No se pudo actualizar el rol de helper'));
    } finally {
      setProcesando(false);
    }
  };

  const handleUpdatePlan = async (planId: string) => {
    if (!selectedUser) return;
    await updateProfile(selectedUser.id, { plan_id: planId });
    setProfiles((prev) => prev.map((p) => (p.id === selectedUser.id ? { ...p, plan_id: planId } : p)));
    setSelectedUser({ ...selectedUser, plan_id: planId });
    setSelectedPlanFeatures(planId ? await getPlanFeatures(planId) : []);
  };

  const handleAssignFeature = async (featureId: string, days?: number) => {
    if (!selectedUser) return;
    let expiresAt: string | null = null;
    if (days) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + days);
      expiresAt = fecha.toISOString();
    }
    await assignFeatureToUser(selectedUser.id, featureId, expiresAt);
    setUserOverrides(await getUserOverrides(selectedUser.id));
  };

  const handleRemoveFeature = async (featureId: string) => {
    if (!selectedUser) return;
    await removeFeatureFromUser(selectedUser.id, featureId);
    setUserOverrides((prev) => prev.filter((override) => override.feature_id !== featureId));
  };

  if (loading) return <LoadingOverlay message="Cargando usuarios..." />;

  const termino = busqueda.trim().toLowerCase();
  const visibles = termino
    ? profiles.filter(
        (profile) =>
          profile.email.toLowerCase().includes(termino) ||
          (profile.full_name || '').toLowerCase().includes(termino),
      )
    : profiles;

  const lista = (
    <div className="flex min-h-0 flex-col gap-2">
      {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}

      <Input
        type="search"
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
        placeholder="Buscar por nombre o correo"
        aria-label="Buscar usuarios"
      />

      <ListPanel
        title="Usuarios"
        count={visibles.length}
        className="min-h-0 flex-1"
        empty={<EmptyState icon={iconoUsuarios} title="Sin resultados" description="Ningún usuario coincide." />}
        headerActions={
          isAdmin && selectedUserIds.length > 0 ? (
            <>
              <Badge tone="primary">{selectedUserIds.length} sel.</Badge>
              <Button size="sm" onClick={() => setMostrarAcciones(true)}>
                Acciones
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])}>
                Limpiar
              </Button>
            </>
          ) : undefined
        }
      >
        {visibles.length === 0
          ? null
          : visibles.map((profile) => (
              <AdminUserRow
                key={profile.id}
                profile={profile}
                plan={plans.find((plan) => plan.id === profile.plan_id)}
                isSelected={selectedUser?.id === profile.id}
                isOnline={!!onlineUsers[profile.id]}
                isChecked={selectedUserIds.includes(profile.id)}
                onToggleCheck={
                  isAdmin
                    ? () =>
                        setSelectedUserIds((prev) =>
                          prev.includes(profile.id)
                            ? prev.filter((id) => id !== profile.id)
                            : [...prev, profile.id],
                        )
                    : undefined
                }
                unreadMessages={unreadCounts[profile.id] ?? 0}
                newLeads={leadAlertCounts[profile.id] ?? 0}
                onSelect={() => void handleSelectUser(profile)}
              />
            ))}
      </ListPanel>
    </div>
  );

  return (
    <>
      <AdminMasterDetail
        listLabel="Usuarios"
        list={lista}
        onBack={() => setSelectedUser(null)}
        emptyDetail={
          <div className="flex w-full items-center justify-center rounded-md border border-dashed border-line-strong">
            <EmptyState
              icon={iconoUsuarios}
              title="Ningún usuario abierto"
              description="Elige a alguien de la lista para ver su ficha."
            />
          </div>
        }
        detail={
          selectedUser ? (
            <AdminUserDetail
              selectedUser={selectedUser}
              plan={plans.find((plan) => plan.id === selectedUser.plan_id)}
              plans={plans}
              features={features}
              planFeatures={selectedPlanFeatures}
              userOverrides={userOverrides}
              profiles={profiles}
              isAdmin={isAdmin}
              isOnline={!!onlineUsers[selectedUser.id]}
              unreadMessages={unreadCounts[selectedUser.id] ?? 0}
              newLeadCount={leadAlertCounts[selectedUser.id] ?? 0}
              liveInsertedLead={liveObservedLead}
              dataRefreshKey={dataRefreshKey}
              openSection={openSection}
              onToggleSection={abrirSeccion}
              isChatOpen={isChatOpen}
              onToggleChat={() => abrirChat(!isChatOpen)}
              onUpdatePlan={handleUpdatePlan}
              onAssignFeature={handleAssignFeature}
              onRemoveFeature={handleRemoveFeature}
            />
          ) : null
        }
      />

      {mostrarAcciones && (
        <AdminBulkActionsModal
          count={selectedUserIds.length}
          isProcessing={procesando}
          onClose={() => setMostrarAcciones(false)}
          onRun={(action) => void handleBulkAction(action)}
        />
      )}
    </>
  );
}
