import { useEffect, useState } from 'react';
import { getPlatform } from '../platform/registry';
import { Button, Card, EmptyState, IconButton, SegmentedControl } from '../design';
import { Icon } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { useMessageFlows } from '../hooks/useMessageFlows';
import { FlowTodayList } from '../components/flows/FlowTodayList';
import { FlowEditor } from '../components/flows/FlowEditor';
import { FlowEnrollPanel } from '../components/flows/FlowEnrollPanel';
import { FlowDetail } from '../components/flows/FlowDetail';
import { dispatchFlowStep } from '../services/flowDispatchService';
import type { MessageFlow, MessageFlowStep, PendingFlowStep } from '../types';

type Vista = 'hoy' | 'flujos' | 'editor' | 'detalle' | 'inscribir';

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
  /*
   * Un solo reloj para toda la pantalla: si cada fila leyera el suyo, dos filas
   * podrian discrepar sobre si algo esta atrasado.
   *
   * Se renueva con cada recarga de la cola y no solo al montar. Estaba
   * congelado en el primer render, y un panel lateral queda abierto dias: a
   * partir de la medianoche siguiente "Toca hoy" y "Atrasado 2d" pasaban a
   * mentir, sin que nada lo delatara.
   */
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    setAhora(new Date());
    flujos.recargarCola();
    flujos.getAll().then(setLista);
  }, [flujos.refreshKey]);

  /** Cuantos pasos tocan hoy o estan atrasados: el numero que va en la barra. */
  const pendientes = flujos.cola.length;

  /** Las vistas profundas traen su propio "Volver" y no pintan la barra. */
  const esVistaDeLista = vista === 'hoy' || vista === 'flujos';

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
    if (!(await getPlatform().dialogs.confirm(`¿Omitir este paso para ${fila.leadName}? Pasa directo al siguiente y lo omitido no se puede volver a programar.`))) return;
    await flujos.omitirPaso(fila.progressId);
    setAviso(`Paso omitido para ${fila.leadName}.`);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/*
        NIVEL 2, y solo cuando tiene una posicion valida.

        Era una fila de pestanas con `border-b-2 border-primary`, o sea el mismo
        dibujo que `PageTabs`, que esta justo encima. Ahora es el carril hundido
        que ya usan Enviar y Plantillas: el subrayado morado queda reservado al
        nivel 1.

        Dos cosas mas, que no son de estilo:

        1. **El contador se muda a "Hoy".** Decia `Flujos · 3`, que es cuantos
           flujos tenes: inventario, no urgencia. Nadie abre esta pantalla para
           saber eso. El numero que importa es cuantos pasos te tocan hoy.

        2. **No se dibuja en las vistas profundas.** En detalle, editor e
           inscribir ninguna de las dos opciones esta activa, asi que se pintaba
           un control de navegacion que no decia donde estabas. Un
           `radiogroup` sin ninguna posicion puesta es una mentira semantica.
           Esas vistas ya traen su propio "Volver".
      */}
      {esVistaDeLista && (
        <div className="flex justify-end">
        <SegmentedControl
          label="Vista"
          value={vista === 'hoy' ? 'hoy' : 'flujos'}
          onChange={(v) => setVista(v)}
          options={[
            { value: 'hoy', label: pendientes > 0 ? `Hoy · ${pendientes}` : 'Hoy' },
            { value: 'flujos', label: 'Flujos' },
          ]}
        />
        </div>
      )}

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

      {vista === 'inscribir' && inscribiendoEn ? (
        /*
         * Inscribir era el unico paso de esta pagina que se abria en un modal.
         * Editar y ver detalle ya eran vistas; ahora las tres se comportan
         * igual, y la lista de leads se ve como la de envio masivo.
         */
        <FlowEnrollPanel
          flujo={inscribiendoEn}
          /* Se vuelve de donde se vino: al detalle si se entro desde ahi, a la
             lista si se entro desde el boton de la fila del flujo. */
          onVolver={() => { setInscribiendoEn(null); setVista(viendo ? 'detalle' : 'flujos'); }}
          onInscribir={async (leadId: string) => {
            await flujos.inscribir(inscribiendoEn.id, leadId);
          }}
        />
      ) : vista === 'detalle' && viendo ? (
        <FlowDetail
          flujo={viendo}
          pasos={pasosViendo}
          refreshKey={flujos.refreshKey}
          /*
            Se limpia `viendo` al salir del detalle. Sin esto quedaba colgado, y
            como el "Volver" de Inscribir decide a donde ir con `viendo ? ...`,
            pasaba lo siguiente: abris el detalle del flujo A, volves, tocas
            "Inscribir" en la fila del flujo B, y al volver aterrizas en el
            detalle del flujo A. Un estado de una pantalla que ya cerraste
            decidiendo la navegacion de otra.
          */
          onVolver={() => { setViendo(null); setVista('flujos'); }}
          onEditar={() => abrirEditor(viendo)}
          onInscribir={() => { setInscribiendoEn(viendo); setVista('inscribir'); }}
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
          title="Todavía no tenés flujos"
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
                <Button size="sm" onClick={() => { setInscribiendoEn(flujo); setVista('inscribir'); }}>
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
                    if (!(await getPlatform().dialogs.confirm(`¿Eliminar el flujo ${flujo.name}? Los leads inscritos dejan de recibir sus pasos pendientes.`))) return;
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

    </div>
  );
}
