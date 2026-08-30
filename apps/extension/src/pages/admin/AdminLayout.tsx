import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../design';
import { loadOpenRequirementsCount, subscribeOpenRequirementsCount } from '../../services/adminService';
import AdminTabs, { type AdminTab } from './AdminTabs';

const AdminUsersPage = lazy(() => import('./AdminUsersPage'));
const AdminCatalogPage = lazy(() => import('./AdminCatalogPage'));
const AdminRequirementsPage = lazy(() => import('./AdminRequirementsPage'));

const candado = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/**
 * Armazon de Admin.
 *
 * Solo hace tres cosas: cortar el paso a quien no es del equipo, elegir la
 * seccion y traer su contador de novedades. Todo lo demas -listas, detalle,
 * formularios- vive dentro de cada seccion.
 *
 * Las secciones se cargan en diferido. Antes las cuatro se importaban de
 * golpe, asi que abrir Admin traia tambien el editor de planes y el catalogo
 * aunque el admin fuera derecho a la bandeja de soporte.
 */
export default function AdminLayout() {
  const { profile, isAdmin } = useAuth();
  const isHelper = profile?.is_helper === true;
  const [activeTab, setActiveTab] = useState<AdminTab>(isAdmin ? 'users' : 'support');
  const [openReqs, setOpenReqs] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchOpenReqs = async () => {
      setOpenReqs(await loadOpenRequirementsCount());
    };

    void fetchOpenReqs();
    return subscribeOpenRequirementsCount(fetchOpenReqs);
  }, [isAdmin]);

  if (!isAdmin && !isHelper) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={candado}
          title="Acceso denegado"
          description="Esta sección es exclusiva para el personal autorizado."
        />
      </div>
    );
  }

  // El helper solo atiende la bandeja. Antes veia tambien la lista completa de
  // usuarios con sus licencias, su telemetria y su base de leads.
  const visibleTabs: AdminTab[] = isAdmin ? ['users', 'catalog', 'support'] : ['support'];
  const tab: AdminTab = visibleTabs.includes(activeTab) ? activeTab : 'support';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AdminTabs
        activeTab={tab}
        onSelect={setActiveTab}
        visibleTabs={visibleTabs}
        openRequirements={openReqs}
      />

      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="p-8 text-center text-micro text-ink-muted">Cargando sección...</div>}>
          {tab === 'users' && <AdminUsersPage />}
          {tab === 'catalog' && <AdminCatalogPage />}
          {tab === 'support' && <AdminRequirementsPage />}
        </Suspense>
      </div>
    </div>
  );
}
