import { useEffect, useState } from 'react';
import type { Profile, Requirement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  archiveRequirement,
  assignRequirementToHelper,
  closeRequirement,
  loadHelperProfiles,
  loadRequirementsWithProfiles,
  subscribeRequirementsFeed,
} from '../../services/adminService';
import { getPlatform } from '../../platform/registry';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatearTiempoRelativo } from '../../utils/date';
import { Badge, Button, EmptyState, ListPanel, ListRow, Notice } from '../../design';
import AdminMasterDetail from '../../components/admin/AdminMasterDetail';
import AdminTicketDetail from '../../components/admin/AdminTicketDetail';
import AdminUserAvatar from '../../components/admin/AdminUserAvatar';
import AdminSkeleton from '../../components/admin/AdminSkeleton';
import { CountBadge } from '../../components/admin/CountBadge';

const iconoBandeja = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

/**
 * Bandeja de requerimientos.
 *
 * La lista era una rejilla de tarjetas de 60px de alto con
 * `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Dos problemas a
 * la vez: en el panel lateral esos cortes (768/1024/1280) no se alcanzan
 * nunca, asi que siempre se pintaban **dos columnas de 150px**, con el nombre,
 * el codigo del ticket, el tipo, la fecha, quien lo atiende y un desplegable de
 * asignacion apretados dentro. Ahora es una lista, como el resto de Admin.
 */
export default function AdminRequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [helpers, setHelpers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { session, isAdmin } = useAuth();
  const currentUserId = session?.user?.id;

  const fetchRequirements = async () => {
    try {
      setRequirements(await loadRequirementsWithProfiles());
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'No se pudieron cargar los requerimientos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequirements();
    if (isAdmin) {
      void loadHelperProfiles()
        .then((lista) => setHelpers(lista as Profile[]))
        .catch(() => undefined);
    }
    return subscribeRequirementsFeed(fetchRequirements);
     
  }, [isAdmin]);

  const ejecutar = async (accion: () => Promise<void>, mensajeError: string, cerrarDetalle = false) => {
    try {
      await accion();
      if (cerrarDetalle) setSelectedId(null);
      await fetchRequirements();
    } catch (actionError) {
      setError(getErrorMessage(actionError, mensajeError));
    }
  };

  const cerrar = async (req: Requirement) => {
    // `dialogs` es el puerto del proyecto; `confirm()` del navegador bloquea el
    // hilo y no existe fuera de la web, que es donde va este codigo despues.
    if (
      !(await getPlatform().dialogs.confirm('Se marca como resuelto para quien lo abrió.', {
        title: '¿Cerrar este requerimiento?',
        confirmLabel: 'Cerrar',
      }))
    ) {
      return;
    }
    await ejecutar(() => closeRequirement(req.id), 'No se pudo cerrar el requerimiento');
  };

  const archivar = async (req: Requirement) => {
    if (
      !(await getPlatform().dialogs.confirm('Deja de aparecer en la bandeja principal.', {
        title: '¿Archivar este requerimiento?',
        confirmLabel: 'Archivar',
      }))
    ) {
      return;
    }
    await ejecutar(() => archiveRequirement(req.id), 'No se pudo archivar el requerimiento', true);
  };

  const tomar = async (req: Requirement) => {
    if (!currentUserId) return;
    await ejecutar(
      () => assignRequirementToHelper(req.id, currentUserId),
      'No se pudo tomar el caso',
    );
  };

  const asignar = async (req: Requirement, helperId: string) => {
    await ejecutar(() => assignRequirementToHelper(req.id, helperId), 'No se pudo asignar el caso');
  };

  const visibles = requirements.filter((req) =>
    showArchived ? req.status === 'archived' : req.status !== 'archived',
  );
  const seleccionado = requirements.find((req) => req.id === selectedId) ?? null;
  const sinAsignar = visibles.filter((req) => !req.helper_id && req.status === 'open').length;
  const reclamos = visibles.filter((req) => req.status === 'claim').length;

  const lista = (
    <div className="flex min-h-0 flex-col gap-2">
      {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}

      <ListPanel
        title={showArchived ? 'Archivados' : 'Bandeja'}
        count={visibles.length}
        className="min-h-0 flex-1"
        headerActions={
          <>
            <CountBadge count={reclamos} tone="danger" label="reclamos abiertos" />
            <CountBadge count={sinAsignar} tone="warning" label="tickets sin asignar" />
            <Button size="sm" variant="ghost" onClick={() => setShowArchived((visible) => !visible)}>
              {showArchived ? 'Activos' : 'Archivo'}
            </Button>
          </>
        }
        empty={
          <EmptyState
            icon={iconoBandeja}
            title={showArchived ? 'Nada archivado' : 'Bandeja vacía'}
            description="Todo está en orden por ahora."
          />
        }
      >
        {loading ? (
          <div className="p-3">
            <AdminSkeleton rows={4} />
          </div>
        ) : visibles.length === 0 ? null : (
          visibles.map((req) => {
            // Un helper no puede abrir el caso de otro helper.
            const bloqueado = !isAdmin && !!req.helper_id && req.helper_id !== currentUserId;

            return (
              <ListRow
                key={req.id}
                density="compact"
                isSelected={selectedId === req.id}
                isUnread={req.status === 'open' && !req.helper_id}
                onClick={bloqueado ? undefined : () => setSelectedId(req.id)}
                className={bloqueado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              >
                {req.user_profile && <AdminUserAvatar profile={req.user_profile} />}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 truncate text-micro font-semibold text-ink">
                      {req.user_profile?.full_name || req.user_profile?.email?.split('@')[0]}
                    </span>
                    {req.status === 'claim' && <Badge tone="danger">Reclamo</Badge>}
                    {!!req.bump_count && req.bump_count > 0 && (
                      <Badge tone="warning">x{req.bump_count}</Badge>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <Badge tone="neutral">{req.type}</Badge>
                    <span className="min-w-0 flex-1 truncate text-micro text-ink-muted">
                      {req.helper_profile
                        ? `Atiende ${req.helper_profile.full_name?.split(' ')[0] || req.helper_profile.email?.split('@')[0]}`
                        : 'Sin asignar'}
                    </span>
                    <span className="shrink-0 text-micro text-ink-muted">
                      {formatearTiempoRelativo(req.created_at)}
                    </span>
                  </div>
                </div>
              </ListRow>
            );
          })
        )}
      </ListPanel>
    </div>
  );

  return (
    <AdminMasterDetail
      listLabel="Bandeja"
      list={lista}
      onBack={() => setSelectedId(null)}
      emptyDetail={
        <div className="flex w-full items-center justify-center rounded-md border border-dashed border-line-strong">
          <EmptyState
            icon={iconoBandeja}
            title="Ningún ticket abierto"
            description="Elige un requerimiento de la bandeja para atenderlo."
          />
        </div>
      }
      detail={
        seleccionado ? (
          <AdminTicketDetail
            requirement={seleccionado}
            helpers={helpers}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            onTake={() => void tomar(seleccionado)}
            onAssign={(helperId) => void asignar(seleccionado, helperId)}
            onClose={() => void cerrar(seleccionado)}
            onArchive={() => void archivar(seleccionado)}
          />
        ) : null
      }
    />
  );
}
