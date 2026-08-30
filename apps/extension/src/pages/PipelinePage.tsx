import { useMemo, useRef, useState } from 'react';
import { useHideUnnamedLeads } from '../hooks/useHideUnnamedLeads';
import { useLeads } from '../hooks/useLeads';
import { usePipelineData } from '../hooks/usePipelineData';
import { useAuth } from '../contexts/AuthContext';
import { PIPELINE_STAGES, STAGE_ACTIONS, STATUS_LABELS, type Lead, type LeadStatus, type WhatsAppTemplate } from '../types';
import { Icon } from '../utils/icons';
import { openWhatsAppForLeads } from '../utils/waHelper';
import LeadDetail from '../components/leads/LeadDetail';
import SinNombreToggle, { contarSinNombre, pasaFiltroDeNombre } from '../components/leads/SinNombreToggle';
import { nombreVisible } from '../utils/leadDisplay';
import DiscardReasonModal from '../components/leads/DiscardReasonModal';
import { createFollowUpTaskForLead } from '../services/tasksService';
import { buscarCitaActivaDelLead, cancelarCitaAntesDeBorrar } from '../services/leadDeletionService';
import { EmptyState, Input, LoadError, Skeleton } from '../design';
import { PipelineStageCard } from '../components/pipeline/PipelineStageCard';
import { PipelineProportionBar } from '../components/pipeline/PipelineProportionBar';
import { StageLeadsSheet } from '../components/pipeline/StageLeadsSheet';
import { MoveLeadSheet } from '../components/pipeline/MoveLeadSheet';
import { TaskFollowUpPrompt } from '../components/pipeline/TaskFollowUpPrompt';

/** Cuantos leads se asoman dentro de cada cuadrante. */
const FICHAS_VISIBLES = 4;

/** Hora que se asume cuando se elige fecha y no hora. */
const HORA_POR_DEFECTO = '09:00';

/**
 * PIPELINE COMERCIAL
 *
 * Cuatro cuadrantes -las cuatro etapas reales- con los leads adentro, que se
 * arrastran de uno a otro.
 *
 * ## Por que cuatro y no cinco
 *
 * 'nuevo' no es una etapa: es la ausencia de una. Lo dice `PIPELINE_STAGES` y
 * lo explica la migracion 062. Un lead con estado 'nuevo' es uno que todavia no
 * se gestiono, no uno que este en una casilla del tablero.
 *
 * ## Pero no desaparecen
 *
 * Sacarlos del tablero sin mas los borraria de la vista: son la mayoria de la
 * base. Por eso arriba hay una fila -no un cuadrante- que los cuenta y abre su
 * lista. Esta hecha de otro material a proposito: sin franja de color y sin
 * entrar en la barra de proporcion, porque la proporcion es entre ETAPAS y esto
 * no es una.
 *
 * Desde esa lista se puede mandar un lead directo a cualquier etapa, sin pasar
 * por la anterior: sirve para los que vienen cerrados de otra fuente.
 *
 * ## La promocion automatica ya existe
 *
 * Escribirle a un lead, agendarle algo o crearle una tarea lo pasa a
 * 'contactado' solo. No lo hace esta pantalla: son triggers de la migracion 062
 * sobre `send_logs`, `appointments` y `tasks`, y solo promueven DESDE 'nuevo',
 * asi que nunca hacen retroceder a un convertido. Aca se nota porque las fichas
 * se ordenan por ultima modificacion: el lead que acabas de tocar aparece
 * primero en Contactado.
 */
export default function PipelinePage() {
  const { user } = useAuth();
  const { save: saveLead, remove: removeLead, restore: restoreLead } = useLeads();
  const { leads, lists, waTemplates, cargando, fallo, recargar } = usePipelineData();

  const [search, setSearch] = useState('');
  const [etapaAbierta, setEtapaAbierta] = useState<LeadStatus | null>(null);
  const [destinoDelArrastre, setDestinoDelArrastre] = useState<LeadStatus | null>(null);
  const [leadArrastrado, setLeadArrastrado] = useState<string | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [leadEnMenu, setLeadEnMenu] = useState<Lead | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean; deshacer?: () => void } | null>(null);

  // Compartido con la tabla de leads y el panel de flujos: es una preferencia
  // de la cuenta, no de esta pantalla.
  const [ocultarSinNombre, setOcultarSinNombre] = useHideUnnamedLeads();

  /** Lead movido, a la espera de decidir si se le agenda seguimiento. */
  const [seguimiento, setSeguimiento] = useState<
    { lead: Lead; nuevoEstado: LeadStatus; estadoAnterior: LeadStatus } | null
  >(null);

  /**
   * Lead soltado en "descartado" a la espera de que se responda por que.
   *
   * El arrastre era el tercer camino que descartaba sin preguntar, despues de
   * la accion masiva. Mientras no se responda no se guarda nada: si se cancela,
   * el lead se queda donde estaba.
   */
  const [pendingDiscard, setPendingDiscard] = useState<Lead | null>(null);

  /**
   * Movimientos aplicados en pantalla que todavia no confirmo el servidor.
   *
   * Sin esto, entre soltar la ficha y verla en su cuadrante nuevo hay DOS
   * viajes de red: el guardado, y la recarga completa que dispara `refreshKey`.
   * La ficha se quedaba quieta un rato largo y parecia que el gesto no habia
   * funcionado.
   *
   * Se aplica al agrupar y se descarta si el guardado falla, asi que un error
   * devuelve la ficha a su sitio en vez de dejarla donde nunca llego a estar.
   */
  const [movimientosPendientes, setMovimientosPendientes] = useState<Record<string, LeadStatus>>({});

  const draggingRef = useRef<string | null>(null);
  const searchLower = search.toLowerCase().trim();

  /*
   * Cuando llegan datos nuevos, se descartan los movimientos que el servidor ya
   * confirmo.
   *
   * Sin esto la lista de pendientes solo crece, y una entrada vieja deja de ser
   * inofensiva en cuanto ese lead cambia de etapa por otra via -desde otro
   * dispositivo, o por el trigger que lo promueve al escribirle-: el pendiente
   * de hace media hora seguiria mandando y taparia el cambio real.
   *
   * Se reconcilia durante el render y no en un efecto, como el reinicio de
   * pagina: con un efecto se pinta una vez con el dato viejo y se corrige
   * despues, que es un parpadeo visible. Y se devuelve el MISMO objeto cuando no
   * sobra nada, para no disparar un render de mas en cada recarga.
   */
  const [leadsReconciliados, setLeadsReconciliados] = useState(leads);
  if (leadsReconciliados !== leads) {
    setLeadsReconciliados(leads);
    setMovimientosPendientes((previos) => {
      const quedan = Object.entries(previos).filter(([id, estado]) => {
        const lead = leads.find((candidato) => candidato.id === id);
        // Un lead que ya no viene -borrado- tampoco necesita su pendiente.
        return lead ? (lead.status || 'nuevo') !== estado : false;
      });
      return quedan.length === Object.keys(previos).length ? previos : Object.fromEntries(quedan);
    });
  }

  const agrupados = useMemo(() => {
    const mapa: Record<LeadStatus, Lead[]> = {
      nuevo: [], contactado: [], interesado: [], convertido: [], descartado: [],
    };

    for (const lead of leads) {
      if (!pasaFiltroDeNombre(lead, ocultarSinNombre)) continue;

      if (searchLower) {
        const coincide =
          lead.name.toLowerCase().includes(searchLower) ||
          (lead.company || '').toLowerCase().includes(searchLower) ||
          (lead.phone || '').includes(searchLower) ||
          (lead.email || '').toLowerCase().includes(searchLower) ||
          (lead.rut || '').toLowerCase().includes(searchLower);
        if (!coincide) continue;
      }

      const pendiente = lead.id ? movimientosPendientes[lead.id] : undefined;
      mapa[pendiente ?? ((lead.status || 'nuevo') as LeadStatus)].push(lead);
    }

    /*
     * Por ultima modificacion, del mas reciente al mas viejo. Es lo que hace
     * visible la promocion automatica sin construir nada: el lead al que le
     * acabas de escribir es la primera ficha de Contactado cuando volves.
     */
    for (const estado of Object.keys(mapa) as LeadStatus[]) {
      mapa[estado].sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      );
    }

    return mapa;
  }, [leads, searchLower, ocultarSinNombre, movimientosPendientes]);

  const cuentas = useMemo(() => {
    const total = {} as Record<LeadStatus, number>;
    for (const estado of Object.keys(agrupados) as LeadStatus[]) total[estado] = agrupados[estado].length;
    return total;
  }, [agrupados]);

  /** Los sin nombre de la etapa abierta, para el interruptor de la hoja. */
  const sinNombreDeLaEtapa = useMemo(
    () => (etapaAbierta ? contarSinNombre(leads.filter((l) => (l.status || 'nuevo') === etapaAbierta)) : 0),
    [leads, etapaAbierta],
  );

  const enElFlujo = PIPELINE_STAGES.reduce((suma, etapa) => suma + cuentas[etapa], 0);

  /**
   * Cuantos leads de cada etapa llevan demasiado tiempo sin moverse.
   *
   * El plazo lo define `STAGE_ACTIONS`. Las etapas finales no lo tienen: un lead
   * convertido no esta trabado por llevar meses convertido.
   *
   * Se mide sobre `updatedAt`, que es lo unico que hay. Vale la pena decir su
   * limite: `updatedAt` cambia con CUALQUIER edicion del lead, no solo con un
   * cambio de etapa. Editarle el telefono a un lead lo saca de la cuenta de
   * trabados sin que haya avanzado. Es una aproximacion util, no una verdad; si
   * el dato importa de veras, haria falta guardar cuando cambio de etapa.
   */
  const trabados = useMemo(() => {
    const ahora = Date.now();
    const total = {} as Record<LeadStatus, number>;

    for (const etapa of PIPELINE_STAGES) {
      const dias = STAGE_ACTIONS[etapa].dias;
      total[etapa] = dias === null
        ? 0
        : agrupados[etapa].filter((lead) => {
            const movido = new Date(lead.updatedAt || 0).getTime();
            if (!movido) return false;
            return (ahora - movido) / 86400000 > dias;
          }).length;
    }

    return total;
  }, [agrupados]);

  /**
   * Guarda el estado nuevo y, si corresponde, ofrece agendar el seguimiento.
   *
   * Antes no habia `try`: si el guardado fallaba, la excepcion subia sin
   * capturar, la ficha simplemente no se movia y no se decia nada. Esto es
   * estado real de negocio del lead, asi que fallar en silencio es caro.
   */
  const aplicarEstado = async (lead: Lead, estado: LeadStatus, motivoDescarte?: string) => {
    const id = lead.id;
    if (!id) return;

    // Se guarda ANTES de tocar nada: es a donde vuelve el lead si te arrepentis.
    const estadoAnterior = (lead.status || 'nuevo') as LeadStatus;

    setAviso(null);
    setMovimientosPendientes((previos) => ({ ...previos, [id]: estado }));

    try {
      await saveLead({ ...lead, status: estado, ...(motivoDescarte ? { discardReason: motivoDescarte } : {}) });
    } catch (error) {
      console.error('[pipeline] no se pudo mover el lead', error);
      // Se revierte el movimiento en pantalla: si no, la ficha quedaria en un
      // cuadrante al que el servidor nunca la dejo entrar.
      setMovimientosPendientes(({ [id]: _descartado, ...resto }) => resto);
      setAviso({ texto: `No se pudo mover a ${nombreVisible(lead.name)}.`, error: true });
      return;
    }

    /*
     * Dos formas de confirmar, segun si hay algo que completar.
     *
     * Al mover a una etapa abierta se ofrece agendar el seguimiento, y esa
     * pregunta ya trae su propio titulo -"X pasó a Y"- y su deshacer, asi que
     * no hace falta ademas una linea diciendo lo mismo.
     *
     * Al descartar no se ofrece nada: proponer un seguimiento para un lead que
     * acabas de dar por perdido, y justo despues de responder por que, se
     * contradice solo. Ahi alcanza con la linea.
     */
    if (estado === 'descartado') {
      setAviso({
        texto: `${nombreVisible(lead.name)} pasó a ${STATUS_LABELS[estado]}.`,
        error: false,
        deshacer: () => void deshacerMovimiento(lead, estadoAnterior),
      });
      return;
    }

    setSeguimiento({ lead, nuevoEstado: estado, estadoAnterior });
  };

  /**
   * Devuelve el lead a donde estaba.
   *
   * Se guarda el objeto original entero, no solo el estado: asi vuelve tambien
   * el motivo de descarte que se le haya puesto al moverlo, en vez de quedar
   * como un lead activo con un motivo de por que se perdio.
   *
   * ## Sobre volver a "sin clasificar"
   *
   * Si el lead estaba en 'nuevo', deshacer lo devuelve ahi, y eso parece
   * contradecir la regla de que un lead gestionado no vuelve a estar sin
   * gestionar. No la contradice: esa regla habla de ASIGNAR 'nuevo' a mano como
   * si fuera una etapa. Deshacer no afirma nada nuevo, restituye lo que era
   * verdad hace cinco segundos. Es la diferencia entre corregir un error y
   * declarar que alguien dejo de estar contactado.
   */
  const deshacerMovimiento = async (lead: Lead, estadoAnterior: LeadStatus) => {
    const id = lead.id;
    if (!id) return;

    setAviso(null);
    // El ofrecimiento de seguimiento era de un movimiento que ya no ocurrio.
    setSeguimiento(null);
    setMovimientosPendientes((previos) => ({ ...previos, [id]: estadoAnterior }));

    try {
      await saveLead(lead);
    } catch (error) {
      console.error('[pipeline] no se pudo deshacer el movimiento', error);
      setMovimientosPendientes(({ [id]: _descartado, ...resto }) => resto);
      setAviso({ texto: 'No se pudo deshacer. Probá de nuevo.', error: true });
    }
  };

  /**
   * Manda el lead a la papelera.
   *
   * Cancela antes su cita activa, si la tiene. Ese paso no es opcional: sin el,
   * la cita sigue en la agenda -y en Google Calendar- apuntando a alguien que ya
   * no esta. La logica se comparte con la tabla de leads en
   * `leadDeletionService` justamente para que no haya dos borrados distintos.
   */
  const eliminarLead = async (lead: Lead) => {
    if (!lead.id) return;
    setAviso(null);
    setLeadEnMenu(null);

    try {
      const citaId = await buscarCitaActivaDelLead(lead);
      await cancelarCitaAntesDeBorrar(lead, citaId);
      await removeLead(lead.id);

      setAviso({
        texto: `${nombreVisible(lead.name)} fue a la papelera.`,
        error: false,
        // El borrado es logico, asi que deshacer es de verdad, no un truco.
        deshacer: () => { void restoreLead(lead.id!); setAviso(null); },
      });
    } catch (error) {
      console.error('[pipeline] no se pudo eliminar el lead', error);
      setAviso({ texto: `No se pudo eliminar a ${nombreVisible(lead.name)}.`, error: true });
    }
  };

  const moverDesdeElMenu = async (estado: LeadStatus) => {
    const lead = leadEnMenu;
    setLeadEnMenu(null);
    if (!lead) return;

    if (estado === 'descartado') {
      setPendingDiscard(lead);
      return;
    }
    await aplicarEstado(lead, estado);
  };

  const soltarEnEtapa = async (estado: LeadStatus) => {
    setDestinoDelArrastre(null);
    setLeadArrastrado(null);
    const leadId = draggingRef.current;
    draggingRef.current = null;
    if (!leadId) return;

    const lead = leads.find((candidato) => candidato.id === leadId);
    if (!lead || (lead.status || 'nuevo') === estado) return;

    if (estado === 'descartado') {
      setPendingDiscard(lead);
      return;
    }
    await aplicarEstado(lead, estado);
  };

  const crearTarea = async ({ titulo, fecha, hora }: { titulo: string; fecha: string; hora: string }) => {
    const pendiente = seguimiento;
    setSeguimiento(null);
    if (!pendiente || !user) return;

    /*
     * Fecha sin hora ya no se pierde. Antes se pedian las dos juntas y, si
     * faltaba la hora, la tarea se creaba SIN VENCIMIENTO sin que nadie avisara.
     */
    const vencimiento = fecha
      ? new Date(`${fecha}T${hora || HORA_POR_DEFECTO}:00`).toISOString()
      : null;

    await createFollowUpTaskForLead({
      userId: user.id,
      leadId: pendiente.lead.id!,
      leadName: pendiente.lead.name,
      newStatus: pendiente.nuevoEstado,
      title: titulo,
      dueDateIso: vencimiento,
    });
  };

  const escribirPorWhatsApp = (lead: Lead, plantilla: WhatsAppTemplate) => {
    openWhatsAppForLeads([lead], plantilla.contenido || '');
  };

  if (cargando) {
    return (
      <div role="status" aria-label="Cargando" className="space-y-3">
        <Skeleton shape="block" height="34px" />
        <Skeleton shape="block" height="10px" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} shape="block" height="196px" />
          ))}
        </div>
      </div>
    );
  }

  if (fallo) {
    return (
      <LoadError
        title="No pudimos cargar tu pipeline"
        description="Revisá la conexión y volvé a intentar."
        onRetry={() => void recargar()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {seguimiento && (
        <TaskFollowUpPrompt
          lead={seguimiento.lead}
          nuevoEstado={seguimiento.nuevoEstado}
          onCrear={(datos) => void crearTarea(datos)}
          onDeshacer={() => void deshacerMovimiento(seguimiento.lead, seguimiento.estadoAnterior)}
          onOmitir={() => setSeguimiento(null)}
        />
      )}

      {/*
        El aviso va en una linea. "Deshacer" es un icono de flecha circular con
        su nombre accesible: un boton con rotulo pedia una fila de 34px para una
        accion que casi nunca se usa, y estirar el aviso empuja el tablero, que
        es a lo que veniste.
      */}
      {aviso && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-meta ${
            aviso.error ? 'bg-state-danger-soft text-state-danger' : 'bg-surface-sunken text-ink-secondary'
          }`}
        >
          <span className="min-w-0 flex-1 truncate">{aviso.texto}</span>
          {aviso.deshacer && (
            <button
              type="button"
              onClick={aviso.deshacer}
              title="Deshacer"
              aria-label="Deshacer"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-3 [&_svg]:w-3"
            >
              <Icon.Restore />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="search"
          value={search}
          onChange={(evento) => setSearch(evento.target.value)}
          placeholder="Buscar nombre, teléfono, email, RUT..."
          className="flex-1"
        />
        <SinNombreToggle
          count={contarSinNombre(leads)}
          ocultos={ocultarSinNombre}
          onToggle={() => setOcultarSinNombre(!ocultarSinNombre)}
        />
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Icon.Pipeline />}
          title="Todavía no tenés leads"
          description="Cuando entren, vas a poder moverlos por las etapas desde acá."
        />
      ) : (
        <>
          {/*
            La puerta de los que todavia no entraron al flujo. Es una fila y no
            un cuadrante: no es una etapa, es de donde salen. Sin franja de
            color y fuera de la barra de proporcion, por lo mismo.
          */}
          {cuentas.nuevo > 0 && (
            <button
              type="button"
              onClick={() => setEtapaAbierta('nuevo')}
              className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="min-w-0 flex-1 text-meta font-medium text-ink">Sin clasificar</span>
              <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-micro font-semibold tabular-nums text-ink-secondary">
                {cuentas.nuevo}
              </span>
              <span className="shrink-0 text-ink-muted [&_svg]:h-3 [&_svg]:w-3">{Icon.ChevronRight()}</span>
            </button>
          )}

          <div>
            <PipelineProportionBar cuentas={cuentas} />
            <p className="mt-1.5 text-micro text-ink-secondary">
              {searchLower
                ? `${enElFlujo} en el flujo coinciden con la búsqueda`
                : `${enElFlujo} ${enElFlujo === 1 ? 'lead' : 'leads'} en el flujo`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PIPELINE_STAGES.map((estado) => (
              <PipelineStageCard
                key={estado}
                estado={estado}
                leads={agrupados[estado].slice(0, FICHAS_VISIBLES)}
                total={cuentas[estado]}
                trabados={trabados[estado] ?? 0}
                esDestinoDelArrastre={destinoDelArrastre === estado}
                leadArrastrado={leadArrastrado}
                onAbrirLista={() => setEtapaAbierta(estado)}
                onAccionesDeLead={setLeadEnMenu}
                onDragStartLead={(lead) => { draggingRef.current = lead.id!; setLeadArrastrado(lead.id!); }}
                onDragEndLead={() => { draggingRef.current = null; setLeadArrastrado(null); setDestinoDelArrastre(null); }}
                onDragOver={() => setDestinoDelArrastre(estado)}
                onDragLeave={() => setDestinoDelArrastre(null)}
                onDrop={() => void soltarEnEtapa(estado)}
              />
            ))}
          </div>
        </>
      )}

      {etapaAbierta && (
        <StageLeadsSheet
          estado={etapaAbierta}
          leads={agrupados[etapaAbierta]}
          onAbrirLead={(lead) => { setViewLead(lead); setEtapaAbierta(null); }}
          onAcciones={(lead) => { setLeadEnMenu(lead); setEtapaAbierta(null); }}
          onClose={() => setEtapaAbierta(null)}
          ocultarSinNombre={ocultarSinNombre}
          onToggleSinNombre={() => setOcultarSinNombre(!ocultarSinNombre)}
          sinNombreTotal={sinNombreDeLaEtapa}
        />
      )}

      {leadEnMenu && (
        <MoveLeadSheet
          lead={leadEnMenu}
          onMover={(estado) => void moverDesdeElMenu(estado)}
          onVerDetalle={() => { setViewLead(leadEnMenu); setLeadEnMenu(null); }}
          onEscribir={
            waTemplates[0]
              ? () => { escribirPorWhatsApp(leadEnMenu, waTemplates[0]!); setLeadEnMenu(null); }
              : undefined
          }
          onEliminar={() => void eliminarLead(leadEnMenu)}
          onClose={() => setLeadEnMenu(null)}
        />
      )}

      {pendingDiscard && (
        <DiscardReasonModal
          cantidad={1}
          onConfirm={(motivo) => {
            const lead = pendingDiscard;
            setPendingDiscard(null);
            if (lead) void aplicarEstado(lead, 'descartado', motivo || undefined);
          }}
          onCancel={() => setPendingDiscard(null)}
        />
      )}

      {viewLead && (
        <LeadDetail
          lead={viewLead}
          lists={lists}
          onClose={() => setViewLead(null)}
          onEdit={() => { /* Solo lectura en pipeline */ }}
        />
      )}
    </div>
  );
}
