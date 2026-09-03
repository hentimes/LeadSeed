import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lead, Profile } from '../../types';
import type { ObservedTemplate } from '../../services/adminService';
import { loadAdminUserBase, transferAdminUserAssets } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatearTiempoRelativo } from '../../utils/date';
import { Badge, Button, Checkbox, EmptyState, ListPanel, ListRow, Notice } from '../../design';
import AdminSkeleton from './AdminSkeleton';
import AdminTransferModal from './AdminTransferModal';
import AdminUserAgenda from './AdminUserAgenda';
import { CountBadge } from './CountBadge';

const CANALES: Array<{ id: string; label: string }> = [
  { id: 'whatsapp', label: 'WA' },
  { id: 'email', label: 'Email' },
  { id: 'call', label: 'Llam.' },
];

function alternar(conjunto: Set<string>, id: string): Set<string> {
  const siguiente = new Set(conjunto);
  if (siguiente.has(id)) siguiente.delete(id);
  else siguiente.add(id);
  return siguiente;
}

/**
 * "Que tiene este usuario": leads, plantillas y agenda.
 *
 * Fusiona tres pestanas y elimina un nivel entero de navegacion.
 *
 *  - **Base** tenia dentro otras dos pestanas (Leads / Plantillas). Eran el
 *    tercer nivel de pestanas anidadas de la seccion, para dos listas cortas.
 *    Ahora son dos listas apiladas.
 *  - **Inventario** contaba las plantillas por canal y listaba los ultimos
 *    leads. Lo primero pasa a las etiquetas de la cabecera de Plantillas; lo
 *    segundo ya lo hacia la lista de Leads, ordenada por fecha. Su consulta
 *    llamaba al mismo rpc que esta vista, asi que cada usuario se cargaba dos
 *    veces.
 *  - **Agenda** es solo lectura y corta: es contenido, no un destino.
 *
 * La barra de transferir, que antes estaba siempre fija sobre la lista aunque
 * no hubiera nada seleccionado, ahora solo aparece cuando hay seleccion.
 */
export default function AdminUserData({
  selectedUser,
  profiles,
  newLeadCount = 0,
  liveInsertedLead = null,
  realtimeRefreshKey = 0,
}: {
  selectedUser: Profile;
  profiles: Profile[];
  newLeadCount?: number;
  liveInsertedLead?: Lead | null;
  realtimeRefreshKey?: number;
}) {
  const { profile: currentUserProfile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<ObservedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [transferencia, setTransferencia] = useState<'leads' | 'templates' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const avisoTimeout = useRef<number | null>(null);

  /**
   * Quien es el usuario cuya respuesta vale.
   *
   * La ficha no se remonta al cambiar de usuario, asi que dos cargas pueden
   * estar en vuelo a la vez. Si el admin pulsa a A y enseguida a B, y la
   * respuesta de A llega despues, sin esto se pintarian **los leads de A bajo
   * la cabecera de B**, que es la pantalla desde la que se transfieren.
   *
   * Los otros cuatro bloques por usuario ya se defendian con un `cancelled`
   * local; este se quedo sin el al trocear la vista "Base".
   */
  const usuarioVigente = useRef(selectedUser.id);

  const cargar = async () => {
    const idPedido = selectedUser.id;
    usuarioVigente.current = idPedido;

    setLoading(true);
    setError('');
    setSelectedLeads(new Set());
    setSelectedTemplates(new Set());
    try {
      const base = await loadAdminUserBase(idPedido, currentUserProfile?.id);
      if (usuarioVigente.current !== idPedido) return;
      setLeads(base.leads);
      setTemplates(base.templates);
    } catch (loadError) {
      if (usuarioVigente.current !== idPedido) return;
      setLeads([]);
      setTemplates([]);
      setError(getErrorMessage(loadError, 'No se pudo cargar la base observada'));
    } finally {
      if (usuarioVigente.current === idPedido) setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserProfile?.id, selectedUser.id]);

  useEffect(() => {
    if (realtimeRefreshKey <= 0) return;
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeRefreshKey]);

  // Un lead que entra en vivo se antepone a la lista en vez de recargarla
  // entera: la recarga perderia la seleccion que el admin tuviera en curso.
  useEffect(() => {
    if (!liveInsertedLead?.id) return;
    setLeads((actuales) =>
      actuales.some((lead) => lead.id === liveInsertedLead.id) ? actuales : [liveInsertedLead, ...actuales],
    );
  }, [liveInsertedLead]);

  useEffect(() => {
    return () => {
      if (avisoTimeout.current !== null) window.clearTimeout(avisoTimeout.current);
    };
  }, []);

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    if (avisoTimeout.current !== null) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => {
      setAviso('');
      avisoTimeout.current = null;
    }, 5000);
  };

  const contadoresPorCanal = useMemo(() => {
    const cuenta: Record<string, number> = {};
    for (const template of templates) {
      const canal = template.tipo || 'whatsapp';
      cuenta[canal] = (cuenta[canal] || 0) + 1;
    }
    return cuenta;
  }, [templates]);

  const transferir = async (targetUserId: string) => {
    const leadIds = transferencia === 'leads' ? Array.from(selectedLeads) : [];
    const templateIds = transferencia === 'templates' ? Array.from(selectedTemplates) : [];

    setIsProcessing(true);
    setError('');
    try {
      await transferAdminUserAssets(targetUserId, leadIds, templateIds);
      setTransferencia(null);
      mostrarAviso(`Transferencia completada: ${leadIds.length + templateIds.length} elemento(s).`);
      await cargar();
    } catch (transferError) {
      setError(getErrorMessage(transferError, 'No se pudo completar la transferencia'));
    } finally {
      setIsProcessing(false);
    }
  };

  const descargarCsv = () => {
    const seleccionados = leads.filter((lead) => selectedLeads.has(lead.id as string));
    const escapar = (valor: string | undefined) => `"${(valor || '').replace(/"/g, '""')}"`;
    const cabecera = 'Nombre,Telefono,Email,Empresa,Estado\n';
    const filas = seleccionados
      .map((lead) => [lead.name, lead.phone, lead.email, lead.company, lead.status].map(escapar).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([cabecera + filas], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `leads_${selectedUser.email}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  if (loading) return <AdminSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}
      {aviso && (
        <Notice tone="success" onDismiss={() => setAviso('')}>
          {aviso}
        </Notice>
      )}

      <ListPanel
        title="Leads"
        count={leads.length}
        headerActions={<CountBadge count={newLeadCount} tone="info" label="leads nuevos sin revisar" />}
        maxHeight="max-h-[320px]"
        empty={<EmptyState title="Sin leads" description="Este usuario no tiene leads en la nube." />}
      >
        {leads.length === 0 ? null : (
          <>
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-1.5">
              <Checkbox
                label="Todos"
                checked={selectedLeads.size === leads.length}
                onChange={() =>
                  setSelectedLeads(
                    selectedLeads.size === leads.length ? new Set() : new Set(leads.map((lead) => lead.id as string)),
                  )
                }
              />
              {selectedLeads.size > 0 && (
                <>
                  <Badge tone="primary">{selectedLeads.size} sel.</Badge>
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" onClick={descargarCsv}>
                      CSV
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setTransferencia('leads')}>
                      Transferir
                    </Button>
                  </div>
                </>
              )}
            </div>

            {leads.map((lead) => (
              <ListRow key={lead.id} density="compact">
                <Checkbox
                  label={null}
                  aria-label={`Seleccionar ${lead.name || 'lead sin nombre'}`}
                  checked={selectedLeads.has(lead.id as string)}
                  onChange={() => setSelectedLeads(alternar(selectedLeads, lead.id as string))}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-micro font-medium text-ink">{lead.name || 'Sin nombre'}</p>
                  <p className="truncate text-micro text-ink-muted">{lead.email || lead.phone || '—'}</p>
                </div>
                <Badge tone="neutral">{lead.status || 'nuevo'}</Badge>
              </ListRow>
            ))}
          </>
        )}
      </ListPanel>

      <ListPanel
        title="Plantillas"
        count={templates.length}
        headerActions={
          <>
            {CANALES.map(({ id, label }) => (
              <Badge key={id} tone="neutral">
                {label} {contadoresPorCanal[id] || 0}
              </Badge>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setMostrarPlantillas((visible) => !visible)}>
              {mostrarPlantillas ? 'Ocultar' : 'Ver'}
            </Button>
          </>
        }
        maxHeight="max-h-[280px]"
      >
        {mostrarPlantillas ? (
          templates.length === 0 ? (
            <EmptyState title="Sin plantillas" description="Este usuario no ha creado ninguna." />
          ) : (
            <>
              {selectedTemplates.size > 0 && (
                <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-1.5">
                  <Badge tone="primary">{selectedTemplates.size} sel.</Badge>
                  <Button
                    size="sm"
                    variant="primary"
                    className="ml-auto"
                    onClick={() => setTransferencia('templates')}
                  >
                    Transferir
                  </Button>
                </div>
              )}
              {templates.map((template) => (
                <ListRow key={template.id} density="compact" className="items-start">
                  <Checkbox
                    label={null}
                    aria-label={`Seleccionar ${template.nombre || 'plantilla sin nombre'}`}
                    checked={selectedTemplates.has(template.id)}
                    onChange={() => setSelectedTemplates(alternar(selectedTemplates, template.id))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-micro font-medium text-ink">
                      {template.nombre || 'Plantilla sin nombre'}
                    </p>
                    <p className="line-clamp-2 text-micro text-ink-muted">{template.contenido || 'Sin contenido'}</p>
                  </div>
                  <span className="shrink-0 text-micro text-ink-muted">
                    {formatearTiempoRelativo(template.createdAt)}
                  </span>
                </ListRow>
              ))}
            </>
          )
        ) : null}
      </ListPanel>

      <AdminUserAgenda selectedUser={selectedUser} />

      {transferencia && (
        <AdminTransferModal
          profiles={profiles}
          excludeUserId={selectedUser.id}
          itemCount={transferencia === 'leads' ? selectedLeads.size : selectedTemplates.size}
          itemLabel={transferencia === 'leads' ? 'leads' : 'plantillas'}
          isProcessing={isProcessing}
          onCancel={() => setTransferencia(null)}
          onConfirm={transferir}
        />
      )}
    </div>
  );
}
