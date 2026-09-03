import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Requirement } from '../../types';
import SupportTicketModal from '../support/SupportTicketModal';
import {
  loadUserSupportRequirements,
  rateSupportRequirement,
  subscribeUserSupportRequirements,
} from '../../services/supportService';
import { formatearTiempoRelativo } from '../../utils/date';
import { Badge, Button, EmptyState, IconButton, ListRow, Notice } from '../../design';

const ABIERTOS = ['open', 'in_progress', 'claim'];

type EstadoVisual = { label: string; tone: 'neutral' | 'warning' | 'success' };

/** Lo que se pinta si llega un estado que este codigo no conoce. */
const ESTADO_DESCONOCIDO: EstadoVisual = { label: 'Pendiente', tone: 'neutral' };

const ESTADOS: Record<string, EstadoVisual> = {
  open: { label: 'Pendiente', tone: 'neutral' },
  in_progress: { label: 'En revisión', tone: 'warning' },
  claim: { label: 'Reclamo', tone: 'warning' },
  closed: { label: 'Resuelto', tone: 'success' },
  archived: { label: 'Archivado', tone: 'neutral' },
};

const pulgarArriba = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const pulgarAbajo = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

/**
 * Tus tickets de soporte.
 *
 * Era una pestana de primer nivel llamada "Ayuda VIP". No es un ajuste: es una
 * bandeja, y de dos o tres elementos. Baja a seccion plegada dentro de Cuenta,
 * que es donde ya esta el plan del que depende.
 *
 * La tarjeta de cabecera -icono indigo de 48px, titulo, parrafo de dos lineas
 * y boton indigo- se reduce a una fila: el boton, o el aviso de que ya tienes
 * uno abierto. Los estados dejan de pintarse con `amber-100` / `green-100` /
 * `purple-100` sueltos y usan los tonos del sistema, que tienen modo oscuro.
 */
export default function SupportTicketsSettings() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    const cargar = async () => {
      const lista = await loadUserSupportRequirements(user.id);
      if (!activo) return;
      setRequirements(lista);
      setLoading(false);
    };

    void cargar();
    const cancelar = subscribeUserSupportRequirements(user.id, 'settings_user_reqs', () => void cargar());

    return () => {
      activo = false;
      cancelar();
    };
  }, [user]);

  const tieneAbierto = requirements.some((req) => ABIERTOS.includes(req.status));

  const valorar = async (reqId: string, rating: 'up' | 'down') => {
    await rateSupportRequirement(reqId, rating);
    setRequirements((prev) => prev.map((req) => (req.id === reqId ? { ...req, rating } : req)));
  };

  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando">
        {[0, 1].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-surface-sunken" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tieneAbierto ? (
        <Notice tone="warning">Ya tienes un ticket activo. Te responderemos por el chat de soporte.</Notice>
      ) : (
        <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
          Levantar ticket
        </Button>
      )}

      {requirements.length === 0 ? (
        <EmptyState title="Sin tickets" description="Todavía no has enviado ninguno." />
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          {requirements.map((req) => {
            const estado = ESTADOS[req.status] ?? ESTADO_DESCONOCIDO;
            const sinValorar = req.status === 'closed' && !req.rating;

            return (
              <ListRow key={req.id} density="compact" className="items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge tone="neutral">{req.type}</Badge>
                    <Badge tone={estado.tone}>{estado.label}</Badge>
                    <span className="shrink-0 text-meta text-ink-muted">
                      {formatearTiempoRelativo(req.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-micro text-ink-secondary">{req.content}</p>
                  {sinValorar && (
                    <p className="mt-1 text-micro text-ink-muted">¿Qué te pareció la atención?</p>
                  )}
                </div>

                {sinValorar && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      size="sm"
                      label="La atención fue buena"
                      icon={pulgarArriba}
                      onClick={() => void valorar(req.id, 'up')}
                    />
                    <IconButton
                      size="sm"
                      label="La atención fue mala"
                      icon={pulgarAbajo}
                      onClick={() => void valorar(req.id, 'down')}
                    />
                  </div>
                )}
                {req.rating && (
                  <Badge tone={req.rating === 'up' ? 'success' : 'danger'}>
                    {req.rating === 'up' ? 'Buena' : 'Mala'}
                  </Badge>
                )}
              </ListRow>
            );
          })}
        </div>
      )}

      <SupportTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
