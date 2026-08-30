import { useState } from 'react';
import type { Profile, Requirement } from '../../types';
import { Badge, Button, Notice, Select } from '../../design';
import { formatearTiempoRelativo } from '../../utils/date';
import AdminSupportChat from './AdminSupportChat';
import AdminUserAvatar from './AdminUserAvatar';

type EstadoVisual = { label: string; tone: 'neutral' | 'warning' | 'danger' | 'success' };

/** Lo que se pinta cuando llega un estado que este codigo no conoce. */
const ESTADO_DESCONOCIDO: EstadoVisual = { label: 'Pendiente', tone: 'neutral' };

const ESTADOS: Record<string, EstadoVisual> = {
  open: { label: 'Pendiente', tone: 'neutral' },
  in_progress: { label: 'En revisión', tone: 'warning' },
  claim: { label: 'Reclamo', tone: 'danger' },
  closed: { label: 'Cerrado', tone: 'success' },
  archived: { label: 'Archivado', tone: 'neutral' },
};

/**
 * Un ticket abierto: quien lo pide, en que estado esta y la conversacion.
 *
 * Antes esto era otro master-detail dentro del master-detail: un tercio de
 * ancho para la ficha del ticket y el resto para el chat. A 320px eso deja la
 * ficha en 105px y el chat en 200, y ninguno de los dos sirve.
 *
 * Ahora la ficha es una cabecera de dos lineas con los botones al lado, y todo
 * lo que no hace falta para responder -el mensaje original, el motivo del
 * reclamo, la valoracion- vive detras de "Ver detalle". El chat se queda con
 * el alto entero, que es lo que hace falta para atender.
 */
export default function AdminTicketDetail({
  requirement,
  helpers,
  isAdmin,
  currentUserId,
  onTake,
  onAssign,
  onClose,
  onArchive,
}: {
  requirement: Requirement;
  helpers: Profile[];
  isAdmin: boolean;
  currentUserId?: string;
  onTake: () => void;
  onAssign: (helperId: string) => void;
  onClose: () => void;
  onArchive: () => void;
}) {
  const [verDetalle, setVerDetalle] = useState(false);
  const estado = ESTADOS[requirement.status] ?? ESTADO_DESCONOCIDO;
  const abierto = ['open', 'in_progress', 'claim'].includes(requirement.status);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface">
      <div className="shrink-0 border-b border-line bg-surface-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {requirement.user_profile && <AdminUserAvatar profile={requirement.user_profile} />}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate text-card-title font-semibold text-ink">
                {requirement.user_profile?.full_name || requirement.user_profile?.email}
              </span>
              <Badge tone={estado.tone}>{estado.label}</Badge>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              {requirement.ticket_code && (
                <span className="shrink-0 font-mono text-micro text-ink-muted">#{requirement.ticket_code}</span>
              )}
              <Badge tone="neutral">{requirement.type}</Badge>
              <span className="shrink-0 text-meta text-ink-muted">
                {formatearTiempoRelativo(requirement.created_at)}
              </span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setVerDetalle((visible) => !visible)}>
            {verDetalle ? 'Ocultar' : 'Detalle'}
          </Button>
        </div>

        {verDetalle && (
          <div className="mt-2 space-y-2">
            <div className="rounded-md border border-line bg-surface p-2">
              <p className="mb-1 text-micro font-bold uppercase tracking-wide text-ink-secondary">
                Mensaje original
              </p>
              <p className="whitespace-pre-wrap text-micro text-ink-secondary">{requirement.content}</p>
            </div>

            {requirement.status === 'claim' && requirement.claim_reason && (
              <Notice tone="danger">Motivo del reclamo: {requirement.claim_reason}</Notice>
            )}

            {requirement.rating && (
              <Notice tone={requirement.rating === 'up' ? 'success' : 'danger'}>
                El usuario calificó la solución como {requirement.rating === 'up' ? 'positiva' : 'negativa'}.
              </Notice>
            )}

            {isAdmin && (
              <Select
                compact
                aria-label="Asignar a un helper"
                value={requirement.helper_id || ''}
                onChange={(event) => event.target.value && onAssign(event.target.value)}
              >
                <option value="">Asignar a...</option>
                {helpers.map((helper) => (
                  <option key={helper.id} value={helper.id}>
                    {helper.full_name || helper.email}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {abierto && !requirement.helper_id && requirement.status === 'open' && currentUserId && (
            <Button size="sm" variant="primary" onClick={onTake}>
              Tomar el caso
            </Button>
          )}
          {abierto && (
            <Button size="sm" onClick={onClose}>
              Marcar completado
            </Button>
          )}
          {requirement.status === 'closed' && (
            <Button size="sm" variant="ghost" onClick={onArchive}>
              Archivar
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {requirement.user_profile && (
          <AdminSupportChat selectedUser={requirement.user_profile} activeRequirement={requirement} />
        )}
      </div>
    </div>
  );
}
