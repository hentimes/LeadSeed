import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, IconButton } from '../design';
import { Icon } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { useMessageFlows } from '../hooks/useMessageFlows';
import { FlowTodayList } from '../components/flows/FlowTodayList';
import { FlowEditor } from '../components/flows/FlowEditor';
import { FlowEnrollModal } from '../components/flows/FlowEnrollModal';
import { FlowDetail } from '../components/flows/FlowDetail';
import { dispatchFlowStep } from '../services/flowDispatchService';
import type { MessageFlow, MessageFlowStep, PendingFlowStep } from '../types';

type Vista = 'hoy' | 'flujos' | 'editor' | 'detalle';

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
  const { user } = useAuth();
  const flujos = useMessageFlows();
  const [vista, setVista] = useState<Vista>('hoy');
  const [lista, setLista] = useState<MessageFlow[]>([]);
  const [aviso, setAviso] = useState('');

  const [editando, setEditando] = useState<MessageFlow | null>(null);
  const [pasosEditando, setPasosEditando] = useState<MessageFlowStep[]>([]);
  const [inscribiendoEn, setInscribiendoEn] = useState<MessageFlow | null>(null);
  const [viendo, setViendo] = useState<MessageFlow | null>(null);
  const [pasosViendo, setPasosViendo] = useState<MessageFlowStep[]>([]);

  // Un solo reloj para toda la pantalla: si cada fila leyera el suyo, dos filas
  // podrian discrepar sobre si algo esta atrasado.
  const [ahora] = useState(() => new Date());

  useEffect(() => {
    flujos.recargarCola();
    flujos.getAll().then(setLista);
  }, [flujos.refreshKey]);

  const abrirEditor = async (flujo: MessageFlow | null) => {
    setEditando(flujo);
    setPasosEditando(flujo ? await flujos.getSteps(flujo.id) : []);
    setVista('editor');
  };

  const abrirDetalle = async (flujo: MessageFlow) => {
    setViendo(flujo);
    setPasosViendo(await flujos.getSteps(flujo.id));
    setVista('detalle');
  };

  const despachar = async (fila: PendingFlowStep) => {
    if (!user) return;
    setAviso('');
    try {
      await dispatchFlowStep(user.id, fila);
      await flujos.recargarCola();
      // "Abierto", no "enviado": con WhatsApp solo consta que se abrio el chat.
      setAviso(
        fila.channel === 'email'
          ? `Correo enviado a ${fila.leadName}.`
          : fila.channel === 'call'
            ? `Llamada registrada para ${fila.leadName}.`
            : `WhatsApp abierto para ${fila.leadName}.`
      );
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo despachar el paso.');
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

      {vista === 'detalle' && viendo ? (
        <FlowDetail
          flujo={viendo}
          pasos={pasosViendo}
          refreshKey={flujos.refreshKey}
          onVolver={() => setVista('flujos')}
          onEditar={() => abrirEditor(viendo)}
          onInscribir={() => setInscribiendoEn(viendo)}
          onPausar={async (activo) => {
            await flujos.setActivo(viendo.id, activo);
            const refrescados = await flujos.getAll();
            setLista(refrescados);
            const actualizado = refrescados.find((f) => f.id === viendo.id);
            if (actualizado) setViendo(actualizado);
            setAviso(activo ? `Flujo ${viendo.name} reanudado.` : `Flujo ${viendo.name} pausado.`);
          }}
          onSacar={async (enrollmentId, motivo) => {
            await flujos.sacar(enrollmentId, motivo);
            setAviso('Lead sacado del flujo.');
          }}
        />
      ) : vista === 'editor' ? (
        <FlowEditor
          flujo={editando}
          pasosIniciales={pasosEditando}
          onCancelar={() => setVista('flujos')}
          onGuardar={async (datos, pasos) => {
            await flujos.save(datos, pasos);
            setLista(await flujos.getAll());
            setVista('flujos');
            setAviso(`Flujo ${datos.name} guardado.`);
          }}
        />
      ) : vista === 'hoy' ? (
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
          action={<Button variant="primary" onClick={() => abrirEditor(null)}>Crear el primero</Button>}
        />
      ) : (
        <Card padding="none">
          <ul className="min-w-0">
            {lista.map((flujo) => (
              <li
                key={flujo.id}
                className="flex min-w-0 items-center gap-2 border-b border-line-soft px-3 py-2.5 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => abrirDetalle(flujo)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-body font-semibold text-ink">{flujo.name}</span>
                  <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                    {CANAL_LABEL[flujo.channel]}
                    {!flujo.isActive && ' · pausado'}
                  </span>
                </button>
                <Button size="sm" onClick={() => setInscribiendoEn(flujo)}>
                  Inscribir
                </Button>
                <IconButton
                  icon={<Icon.Edit />}
                  label={`Editar el flujo ${flujo.name}`}
                  size="sm"
                  className="shrink-0"
                  onClick={() => abrirEditor(flujo)}
                />
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

      {vista === 'flujos' && lista.length > 0 && (
        <Button variant="primary" onClick={() => abrirEditor(null)}>
          Nuevo flujo
        </Button>
      )}

      {inscribiendoEn && (
        <FlowEnrollModal
          flujo={inscribiendoEn}
          onClose={() => setInscribiendoEn(null)}
          onInscribir={async (leadId) => {
            await flujos.inscribir(inscribiendoEn.id, leadId);
          }}
        />
      )}
    </div>
  );
}
