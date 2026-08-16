import { useEffect, useState } from 'react';
import { Card, EmptyState, IconButton } from '../design';
import { Icon } from '../utils/icons';
import { useMessageFlows } from '../hooks/useMessageFlows';
import { FlowTodayList } from '../components/flows/FlowTodayList';
import type { MessageFlow, PendingFlowStep } from '../types';

type Vista = 'hoy' | 'flujos';

const CANAL_LABEL = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Llamadas',
} as const;

/**
 * Flujos de mensajes.
 *
 * La vista por defecto es **Hoy**, no la lista de flujos: la pregunta del
 * usuario es "que me falta enviar hoy", que cruza todos los flujos. Entrar por
 * la lista obligaria a abrir cada uno para enterarse de si hay algo pendiente.
 */
export default function FlowsPage() {
  const flujos = useMessageFlows();
  const [vista, setVista] = useState<Vista>('hoy');
  const [lista, setLista] = useState<MessageFlow[]>([]);
  const [aviso, setAviso] = useState('');

  // Un solo reloj para toda la pantalla: si cada fila leyera el suyo, dos filas
  // podrian discrepar sobre si algo esta atrasado.
  const [ahora] = useState(() => new Date());

  useEffect(() => {
    flujos.recargarCola();
    flujos.getAll().then(setLista);
  }, [flujos.refreshKey]);

  const despachar = async (fila: PendingFlowStep) => {
    setAviso('');
    try {
      // De momento el despacho solo registra el paso. Abrir el canal se
      // engancha en el siguiente bloque, reusando los compositores que ya
      // escriben en send_logs: los flujos no crean un camino de envio paralelo.
      await flujos.registrarPaso(fila.progressId);
      setAviso(`Paso registrado para ${fila.leadName}.`);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo registrar el paso.');
    }
  };

  const omitir = async (fila: PendingFlowStep) => {
    if (!confirm(`¿Omitir este paso para ${fila.leadName}? Pasara directo al siguiente.`)) return;
    await flujos.omitirPaso(fila.progressId);
    setAviso(`Paso omitido para ${fila.leadName}.`);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div role="tablist" aria-label="Vista" className="flex border-b border-line">
        {(['hoy', 'flujos'] as Vista[]).map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={vista === v}
            onClick={() => setVista(v)}
            className={`flex-1 border-b-2 px-2 py-2 text-body transition-colors ${
              vista === v
                ? 'border-primary font-semibold text-ink'
                : 'border-transparent font-medium text-ink-secondary hover:text-ink'
            }`}
          >
            {v === 'hoy' ? 'Hoy' : `Flujos${lista.length > 0 ? ` · ${lista.length}` : ''}`}
          </button>
        ))}
      </div>

      {/* Region viva: los cambios de estado tienen que anunciarse, no solo
          verse. Quien usa lector de pantalla no esta mirando la fila que
          cambio. */}
      <p aria-live="polite" className="sr-only">
        {aviso}
      </p>
      {aviso && (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-micro text-ink-secondary">
          {aviso}
        </p>
      )}

      {vista === 'hoy' ? (
        <FlowTodayList
          cola={flujos.cola}
          ahora={ahora}
          onDespachar={despachar}
          onOmitir={omitir}
          onIrAFlujos={() => setVista('flujos')}
        />
      ) : lista.length === 0 ? (
        <EmptyState
          title="Todavia no tienes flujos"
          description="Un flujo es una secuencia: el paso 1 hoy, el 2 a los tres dias. LeadSeed te avisa el dia que toca; tu decides si se envia."
        />
      ) : (
        <Card padding="none">
          <ul className="min-w-0">
            {lista.map((flujo) => (
              <li
                key={flujo.id}
                className="flex min-w-0 items-center gap-2 border-b border-line-soft px-3 py-2.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{flujo.name}</span>
                  <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                    {CANAL_LABEL[flujo.channel]}
                    {!flujo.isActive && ' · pausado'}
                  </span>
                </div>
                <IconButton
                  icon={<Icon.Trash />}
                  label={`Eliminar el flujo ${flujo.name}`}
                  size="sm"
                  variant="ghost-danger"
                  className="shrink-0"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar el flujo ${flujo.name}?`)) return;
                    try {
                      await flujos.remove(flujo.id);
                      setAviso(`Flujo ${flujo.name} eliminado.`);
                    } catch (error) {
                      setAviso(error instanceof Error ? error.message : 'No se pudo eliminar.');
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {vista === 'flujos' && (
        <p className="text-micro text-ink-muted">
          El editor de flujos llega en el siguiente bloque. Por ahora se pueden ver y eliminar.
        </p>
      )}
    </div>
  );
}
