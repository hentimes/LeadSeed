import { useEffect, useMemo, useRef, useState } from 'react';
import { getPlatform } from '../../platform/registry';
import { useHideUnnamedLeads } from '../../hooks/useHideUnnamedLeads';
import { Button, IconButton, ListPagination, ListPanel, ListRow, Modal, Select } from '../../design';
import { Icon } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLeadsParaSelector } from '../../services/leadsService';
import {
  fetchFlowPositions,
  fetchFlowSteps,
  fetchResumePoints,
} from '../../services/messageFlowsService';
import {
  filtrarPorInscripcion,
  indexarPosiciones,
  ocupaElCanal,
  ordenarCandidatos,
  posicionVisible,
  type CriterioInscripcion,
  type CriterioOrdenCandidato,
  type PosicionEnFlujo,
} from '../../services/flowEnrollSort';
import { FlowEnrollFilters } from './FlowEnrollFilters';
import {
  indexarPuntos,
  ofertaParaLead,
  venceAlRetomar,
  type PuntoDeRetoma,
} from '../../services/flowResume';
import type { Lead, MessageFlow, MessageFlowStep, SendLog } from '../../types';
import { fetchEnvioDeLeadEn } from '../../services/historyService';
import { puedeRecibirPor } from '../../utils/leadContacto';
import LeadIdentity from '../leads/LeadIdentity';
import { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';
import { formatearFecha } from '../../utils/date';

interface Props {
  flujo: MessageFlow;
  /**
   * `ultimoPasoHecho` en cero inscribe desde el primer paso, que es lo de
   * siempre. Con un numero mayor, la base da esos pasos por hechos y deja
   * pendiente el siguiente, contando su espera desde `desde`.
   */
  onInscribir: (leadId: string, ultimoPasoHecho: number, desde: string | null) => Promise<void>;
  /** Inscribe a todos los que quedaron en el filtro, cada uno por donde va. */
  onInscribirTodos: (
    leadIds: string[],
  ) => Promise<{ inscritos: number; yaEnFlujo: number; fallidos: number }>;
  onVolver: () => void;
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' });

/**
 * Inscribir un lead en un flujo.
 *
 * Solo lista los leads que tienen el dato que el canal necesita: inscribir en
 * un flujo de correo a alguien sin correo es programar un envio que no puede
 * salir. Se filtran aqui en vez de dejar que falle al despachar.
 *
 * El rechazo por canal ocupado -la base solo admite una inscripcion activa por
 * lead y canal- llega traducido desde el servicio, porque el texto crudo de
 * Postgres no le dice nada a nadie.
 *
 * ## Por que dejo de ser un modal el 2026-08-20
 *
 * Era el unico de esta pagina. Editar un flujo y ver su detalle ya eran vistas
 * incrustadas; solo inscribir se abria en una ventana encima. El resultado es
 * que la misma tarea -elegir un lead de una lista- se veia de una forma aqui y
 * de otra en envio masivo, y las dos listas parecian de productos distintos
 * aunque su contenido fuera identico.
 *
 * Ahora es una vista mas del conmutador de `FlowsPage`, con su "Volver" como
 * las otras dos. El modal no aportaba nada que la vista no de: no hay nada
 * detras que convenga seguir viendo mientras eliges.
 */
/**
 * La ayuda del titulo. Explica el modelo entero, que no es evidente.
 *
 * "Empieza en el paso N" significa que los anteriores se dan por hechos y que
 * el N es el primer mensaje que va a recibir. Sin decirlo, el desplegable de la
 * fila se puede leer al reves -"empieza en el 2" como "todavia le falta el
 * 1"- y esa confusion se paga mandando el mensaje equivocado.
 */
const AYUDA = (canal: string) =>
  'Elegi en que paso empieza cada uno: los anteriores quedan como hechos y ese queda programado. ' +
  'Si ya le enviaste alguno de los mensajes del flujo, el paso viene puesto solo y la espera se cuenta ' +
  `desde ese envio. Solo aparecen leads con ${canal === 'email' ? 'correo' : 'teléfono'}.`;

/**
 * Cuantos leads por pagina.
 *
 * Diez y no doce, y el numero esta acoplado a lo que esta pantalla lleva encima
 * de la lista: cabecera, fila de filtros, la linea de la tanda y -si se
 * despliega el embudo- otra fila de selectores. Con doce filas la paginacion
 * quedaba debajo del corte de la ventana: estaba, pero habia que scrollear
 * doce filas para descubrir que existia una pagina 2, y quien no lo hacia daba
 * por hecho que sus candidatos eran esos.
 *
 * Se prefiere bajar el numero antes que darle a la lista un alto fijo con
 * scroll propio: esta vista ocupa la pagina entera y ya scrollea, y una caja
 * que scrollea dentro de otra que scrollea hace que la rueda del raton haga
 * cosas distintas segun donde este el puntero.
 *
 * Si se agrega otra fila de controles arriba, hay que volver a bajarlo.
 */
const LEADS_POR_PAGINA = 10;

export function FlowEnrollPanel({ flujo, onInscribir, onInscribirTodos, onVolver }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  /** Lo que dejo la ultima tanda. Se queda en pantalla: es el unico registro. */
  const [resumen, setResumen] = useState('');
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  /* Mismo filtro que en envio masivo, y con la misma pieza: las dos listas
     tienen que seguir viendose iguales. */
  // Misma preferencia que la tabla de leads y el pipeline.
  const [ocultarSinNombre, setOcultarSinNombre] = useHideUnnamedLeads();
  /* Van aca arriba, con el resto del estado del filtro, porque `filtroActual`
     -que reinicia la pagina- las lee unas lineas mas abajo. */
  const [inscripcion, setInscripcion] = useState<CriterioInscripcion>('todos');
  const [orden, setOrden] = useState<CriterioOrdenCandidato>('nombre');
  /*
   * EN QUE PASO EMPIEZA CADA UNO, cuando se elige a mano.
   *
   * Solo guarda a los que el usuario cambio. Los demas usan lo que se detecto,
   * o el paso 1: un valor por lead para los 1.900 seria estado que nadie pidio
   * y que ademas habria que mantener al cambiar de flujo.
   */
  const [pasoElegido, setPasoElegido] = useState<Map<string, number>>(new Map());

  /*
   * Al filtrar, la pagina 7 puede dejar de existir. Se ajusta durante el render
   * y no desde un efecto, que pintaria la pagina vieja antes de corregirse.
   */
  const filtroActual = `${busqueda}|${ocultarSinNombre}|${inscripcion}|${orden}`;
  const [filtroAnterior, setFiltroAnterior] = useState(filtroActual);
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setPagina(1);
  }

  /*
   * POR DONDE VA CADA LEAD.
   *
   * Se pide UNA vez al abrir la pantalla, no una por lead: la base devuelve una
   * fila por lead que tenga algun envio de las plantillas del flujo -ver la
   * migracion 158-, asi que con el indice en la mano cada fila resuelve su
   * oferta sin ir a la red.
   *
   * Los pasos hacen falta para dos cosas: saber cuantos son -un lead que
   * recibio el ultimo ya no tiene nada que retomar- y de cuanto es la espera
   * del siguiente, que es lo que se promete en el boton.
   */
  const [pasos, setPasos] = useState<MessageFlowStep[]>([]);
  const [puntos, setPuntos] = useState<Map<string, PuntoDeRetoma>>(new Map());
  /*
   * QUIEN YA ESTA EN UN FLUJO. Se pide una vez, para toda la agenda.
   *
   * No es adorno: la 108 admite una inscripcion activa por lead y canal, asi
   * que sin esto el rechazo llegaba DESPUES de pulsar Inscribir. Ahora la fila
   * lo dice antes, y ademas se puede filtrar y ordenar por ello.
   */
  const [posiciones, setPosiciones] = useState<Map<string, PosicionEnFlujo[]>>(new Map());

  useEffect(() => {
    let cancelado = false;
    if (user) {
      void fetchLeadsParaSelector(user.id).then((suyos) => {
        if (!cancelado) setLeads(suyos);
      });
    }
    return () => {
      cancelado = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const [susPasos, susPuntos, susPosiciones] = await Promise.all([
        fetchFlowSteps(flujo.id),
        fetchResumePoints(flujo.id),
        fetchFlowPositions(),
      ]);
      if (cancelado) return;
      setPasos(susPasos);
      setPuntos(indexarPuntos(susPuntos));
      setPosiciones(indexarPosiciones(susPosiciones));
    })();
    return () => {
      cancelado = true;
    };
  }, [flujo.id]);

  const q = busqueda.trim().toLocaleLowerCase('es');
  /*
   * Aqui habia un `.slice(0, 50)` sin aviso: con mas de cincuenta candidatos,
   * el lead 51 sencillamente no existia para esta pantalla y nada lo decia.
   * Ahora se paginan todos.
   */
  const conDato = useMemo(
    /* La misma regla que el selector de destinatarios: quien puede recibir por
       este canal. Antes esta pantalla tenia su propia copia. */
    () => leads.filter((lead) => puedeRecibirPor(lead, flujo.channel)),
    [leads, flujo.channel],
  );
  const sinNombre = useMemo(() => contarSinNombre(conDato), [conDato]);

  /*
   * TODA LA CADENA EN UN `useMemo`, y es de los pocos sitios donde de verdad
   * hace falta.
   *
   * `busqueda` es estado controlado: cada tecla repinta el componente. Sin
   * memoizar, cada letra volvia a filtrar 1.900 leads y a ordenarlos con un
   * `Intl.Collator` -que compara cadena a cadena, no es una resta de numeros-.
   * Es el unico calculo caro de la pantalla; lo demas -las cuentas por fila-
   * son diez operaciones sobre diez filas y memoizarlas seria ruido.
   *
   * La dependencia es `q`, ya normalizada, y no `busqueda`: escribir una
   * mayuscula o un espacio al final no cambia el resultado y no tiene por que
   * invalidar el calculo.
   */
  const candidatos = useMemo(
    () =>
      ordenarCandidatos(
        filtrarPorInscripcion(
          conDato
            .filter((l) => pasaFiltroDeNombre(l, ocultarSinNombre))
            .filter((l) =>
              q
                ? (l.name || '').toLocaleLowerCase('es').includes(q) ||
                  (l.phone || '').includes(q) ||
                  (l.email || '').toLocaleLowerCase('es').includes(q)
                : true,
            ),
          inscripcion,
          posiciones,
          puntos,
        ),
        orden,
        posiciones,
        puntos,
        flujo.channel,
      ),
    [conDato, ocultarSinNombre, q, inscripcion, orden, posiciones, puntos, flujo.channel],
  );

  const totalPaginas = Math.max(1, Math.ceil(candidatos.length / LEADS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = candidatos.slice(
    (paginaActual - 1) * LEADS_POR_PAGINA,
    paginaActual * LEADS_POR_PAGINA,
  );

  const [enTanda, setEnTanda] = useState(false);
  /** Cuantos se inscribieron sin salir de aqui. Es el unico rastro de la sesion. */
  const [inscritosAqui, setInscritosAqui] = useState(0);

  /*
   * VER QUE SE LE MANDO.
   *
   * "Ya recibio el paso 1" no dice nada por si solo: el paso 1 es una plantilla
   * distinta en cada flujo, y la que sea decide si tiene sentido mandarle el 2.
   * Con mil leads en pantalla, ir a buscarlo al historial de cada uno no es una
   * opcion.
   *
   * Se muestra la COPIA GUARDADA del envio, no el texto de la plantilla viva:
   * la plantilla se pudo editar despues, y se pudo borrar -que es justo el caso
   * que arreglo la 163-. La copia es lo unico que no cambia.
   */
  const [viendoEnvio, setViendoEnvio] = useState<{ lead: Lead; paso: number } | null>(null);
  const [envio, setEnvio] = useState<SendLog | null>(null);
  const [cargandoEnvio, setCargandoEnvio] = useState(false);

  /*
   * Un testigo por peticion: dos clics seguidos en dos filas distintas podian
   * dejar que la respuesta mas lenta pintara el mensaje de OTRO lead bajo el
   * nombre del que dice la cabecera. En una pantalla cuyo proposito es "ver que
   * se le mando a este", ensenar el mensaje de otro es el peor fallo posible.
   */
  const peticionDeEnvio = useRef(0);

  const verEnvio = async (lead: Lead, paso: number, desde: string) => {
    const mia = ++peticionDeEnvio.current;
    setViendoEnvio({ lead, paso });
    setEnvio(null);
    setCargandoEnvio(true);
    try {
      const encontrado = await fetchEnvioDeLeadEn(lead.id!, desde);
      if (peticionDeEnvio.current !== mia) return;
      setEnvio(encontrado);
    } finally {
      if (peticionDeEnvio.current === mia) setCargandoEnvio(false);
    }
  };

  /**
   * INSCRIBIR A TODOS LOS QUE QUEDARON EN EL FILTRO.
   *
   * Cada uno entra por el paso que ya recibio, y esa deteccion la rehace la
   * base: mandarsela calculada desde aqui seria dejar que el cliente decida que
   * pasos se dan por hechos.
   *
   * Se confirma antes con la cifra y con lo que va a pasar, porque es la accion
   * de mas alcance de la pantalla -cien inscripciones y cien mensajes
   * programados- y no hay forma de deshacerla en bloque.
   */
  const inscribirTodos = async () => {
    const ids = candidatos.map((lead) => lead.id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;

    const confirmado = await getPlatform().dialogs.confirm(
      `Cada uno entra por el paso que ya recibió: los anteriores quedan como hechos y el siguiente queda programado. A quien no le conste ninguno, entra por el paso 1. Los que ya estén en un flujo de ${flujo.channel === 'email' ? 'correo' : 'WhatsApp'} se saltan.`,
      {
        title: `¿Inscribir a ${ids.length} en ${flujo.name}?`,
        confirmLabel: `Inscribir ${ids.length}`,
      },
    );
    if (!confirmado) return;

    setError('');
    setEnTanda(true);
    try {
      const { inscritos, yaEnFlujo, fallidos } = await onInscribirTodos(ids);
      const partes = [`${inscritos} inscritos`];
      if (yaEnFlujo > 0) partes.push(`${yaEnFlujo} ya estaban en un flujo`);
      if (fallidos > 0) partes.push(`${fallidos} no se pudieron`);
      setResumen(partes.join(' · '));
      setInscritosAqui((cuantos) => cuantos + inscritos);
      /* Aca si se vuelve a preguntar: anotar cien inscripciones a mano seria
         reconstruir en el cliente lo que la base acaba de decidir, y con la
         primera que no cuadrara la lista empezaria a mentir. */
      setPosiciones(indexarPosiciones(await fetchFlowPositions()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo inscribir la tanda.');
    } finally {
      setEnTanda(false);
    }
  };

  /**
   * INSCRIBIR NO CIERRA LA LISTA.
   *
   * Cerraba al primer exito y volvia al detalle del flujo. Con un lead suelto
   * daba igual; con veinte -que es el caso real- obligaba a rehacer el camino
   * entero por cada uno: entrar, buscar, filtrar, paginar, inscribir, y otra
   * vez. Se sale por "Volver", que ya estaba, cuando uno decide.
   *
   * La fila se actualiza SIN volver a preguntar a la base: se anota la
   * inscripcion que se acaba de hacer y `bloqueadoPor` la ve enseguida, asi que
   * el boton pasa a "Ya en flujo" en el acto. Una consulta por inscripcion
   * pondria medio segundo de espera entre cada una, que en veinte es lo mismo
   * que volver al problema anterior.
   */
  const inscribir = async (lead: Lead, ultimoPasoHecho: number, desde: string | null) => {
    setError('');
    setInscribiendo(lead.id!);
    try {
      await onInscribir(lead.id!, ultimoPasoHecho, desde);

      const siguiente = ultimoPasoHecho + 1;
      setPosiciones((previas) => {
        const copia = new Map(previas);
        copia.set(lead.id!, [
          ...(previas.get(lead.id!) ?? []),
          {
            leadId: lead.id!,
            flowId: flujo.id,
            flowName: flujo.name,
            channel: flujo.channel,
            // Sin paso siguiente la inscripcion nace cerrada; ver la 158.
            stepOrder: siguiente <= pasos.length ? siguiente : null,
            /* La fecha se sabe -es la que se acaba de prometer en el boton-,
               asi que se anota. Poner nulo teniendo el dato es la clase de
               media verdad que se descubre el dia que alguien la lea. */
            dueAt:
              siguiente <= pasos.length
                ? venceAlRetomar(desde ?? ahora.toISOString(), esperaDelPaso(siguiente)).toISOString()
                : null,
          },
        ]);
        return copia;
      });

      setInscritosAqui((cuantos) => cuantos + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo inscribir.');
    } finally {
      setInscribiendo(null);
    }
  };

  /*
   * Un solo reloj por render, como en `FlowDetail`. Leerlo dentro del map daria
   * marcas distintas a filas de la misma pantalla.
   */
  const ahora = new Date();

  /** La espera del paso que quedaria pendiente, para poder prometer la fecha. */
  const esperaPorPaso = useMemo(
    () => new Map(pasos.map((paso) => [paso.stepOrder, paso.waitDays])),
    [pasos],
  );
  const esperaDelPaso = (stepOrder: number): number => esperaPorPaso.get(stepOrder) ?? 0;

  /**
   * Desde que fecha se cuenta la espera del paso que queda pendiente.
   *
   * Si consta un envio de un paso anterior, desde ESE envio: alguien a quien le
   * escribiste hace cinco dias en un flujo que espera tres tiene que quedar
   * vencido hoy. Si el paso se eligio a mano y no hay envio que lo respalde, se
   * cuenta desde ahora, que es lo unico que se sabe.
   */
  const baseDelPaso = (empiezaEn: number, punto: PuntoDeRetoma | undefined): string | null =>
    punto && punto.ultimoPasoHecho === empiezaEn - 1 ? punto.ultimoEnvioAt : null;

  return (
    /*
     * Misma estructura que el paso "Destinatarios" de envio masivo, a
     * proposito: tarjeta con relleno, cabecera, buscador, y la lista con
     * sangria negativa para que sus filas lleguen al borde de la tarjeta.
     * Antes esta lista colgaba suelta de la pagina, y por eso no se parecia a
     * la otra aunque sus filas fueran identicas.
     */
    <section className="card-standard flex min-h-0 flex-col gap-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton icon={<Icon.ArrowLeft />} label="Volver" size="sm" onClick={onVolver} />
        {/*
          El subtitulo ocupaba dos lineas para explicar dos reglas que solo
          importan la primera vez. Pasa a un icono de ayuda: quien ya lo sabe
          no lo lee, y quien no, lo tiene a un puntero de distancia.
        */}
        <h2 className="min-w-0 truncate text-card-title font-semibold text-ink">
          Inscribir en {flujo.name}
        </h2>
        <span
          className="shrink-0 cursor-help text-ink-muted"
          tabIndex={0}
          role="note"
          aria-label={AYUDA(flujo.channel)}
          title={AYUDA(flujo.channel)}
        >
          <div className="w-3.5">{Icon.Help()}</div>
        </span>
      </div>

      <FlowEnrollFilters
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        sinNombre={sinNombre}
        ocultarSinNombre={ocultarSinNombre}
        onOcultarSinNombreChange={setOcultarSinNombre}
        inscripcion={inscripcion}
        onInscripcionChange={setInscripcion}
        orden={orden}
        onOrdenChange={setOrden}
      />

      {error && <p role="alert" className="text-micro text-state-danger">{error}</p>}
      {resumen && (
        <p role="status" className="text-micro text-ink-secondary">
          {resumen}
        </p>
      )}

      {/*
        LA TANDA. Una sola linea, y solo cuando hay algo que inscribir.

        Va debajo de los filtros y encima de la lista porque es la accion que se
        aplica a lo que el filtro dejo: leerla en otro sitio obligaria a
        emparejarla con la vista a ojo. Dice la cifra en el rotulo -no "todos"-
        porque "todos" no significa nada sin saber cuantos son.
      */}
      {candidatos.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-micro text-ink-muted">
            {candidatos.length} {candidatos.length === 1 ? 'candidato' : 'candidatos'} en la vista
            {/* Lo inscrito sin salir de aqui. Sin esta cuenta, despues de veinte
                inscripciones no queda ni rastro de cuantas fueron: la lista se
                ve igual salvo por los botones apagados, que hay que ir a
                buscar de a uno. */}
            {inscritosAqui > 0 && (
              <span className="text-state-success-ink">
                {' · '}
                {inscritosAqui} {inscritosAqui === 1 ? 'inscrito' : 'inscritos'}
              </span>
            )}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={enTanda || inscribiendo !== null}
            onClick={inscribirTodos}
            className="shrink-0"
          >
            {enTanda ? 'Inscribiendo...' : `Inscribir los ${candidatos.length}`}
          </Button>
        </div>
      )}

      <ListPanel
        flush
        className="-mx-3"
        footer={
          <ListPagination page={paginaActual} pageCount={totalPaginas} onPageChange={setPagina} />
        }
        empty={
          <p className="px-3 py-6 text-center text-micro text-ink-muted">
            {leads.length === 0
              ? 'Todavia no tienes leads.'
              : `Ningún lead con ${flujo.channel === 'email' ? 'correo' : 'teléfono'} coincide.`}
          </p>
        }
      >
        {visibles.map((lead) => {
          const oferta = ofertaParaLead(puntos.get(lead.id!), pasos.length);
          const contacto = flujo.channel === 'email' ? lead.email : lead.phone;
          const ocupado = inscribiendo !== null;
          /*
            Si ya tiene una inscripcion activa de ESTE canal, no se puede
            inscribir: el indice unico de la 108 lo rechaza. Antes eso se sabia
            despues de pulsar; ahora la fila lo dice y los botones se apagan.
          */
          const sus = lead.id ? posiciones.get(lead.id) : undefined;
          const bloqueadoPor = ocupaElCanal(sus, flujo.channel);
          const enOtroFlujo = posicionVisible(sus, flujo.channel);

          /*
             Lo detectado se dice bajo el nombre, junto al telefono, y no en un
             distintivo aparte: es la razon por la que el boton de al lado dice
             algo distinto al de las demas filas, y separarlos obligaria a
             emparejarlos con la vista.
          */
          /*
            "Ya recibio el paso N" y no "los N pasos": lo que la base devuelve
            es el paso MAS AVANZADO cuya plantilla consta enviada, no cuantos
            recibio. Alguien a quien le mandaste el mensaje del paso 2 sin
            haberle mandado el 1 tiene N = 2, y decirle "ya recibio los 2 pasos"
            seria afirmar un envio que no ocurrio.
          */
          const detectado =
            oferta.tipo === 'retomar'
              ? `Ya recibió el paso ${oferta.ultimoPasoHecho} · ${FECHA_CORTA.format(new Date(oferta.desde))}`
              : oferta.tipo === 'ya-los-recibio-todos'
                ? `Ya recibió el último paso · ${FECHA_CORTA.format(new Date(oferta.desde))}`
                : null;

          /* En qué flujo está, si está en alguno. Es lo que faltaba para poder
             decidir sin abrir cada flujo por separado. */
          const enFlujo = enOtroFlujo
            ? `En «${enOtroFlujo.flowName}»${
                enOtroFlujo.stepOrder !== null ? ` · paso ${enOtroFlujo.stepOrder}` : ''
              }`
            : null;

          const caption =
            detectado === null && enFlujo === null ? (
              contacto
            ) : (
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                <span className="truncate">{contacto}</span>
                {enFlujo && (
                  <span className={bloqueadoPor ? 'text-state-warning-ink' : 'text-ink-secondary'}>
                    {enFlujo}
                  </span>
                )}
                {detectado && (
                  /*
                    Es un boton y no un `span`: abre lo que se le mando. La fila
                    entera no es clicable -aqui el clic principal es inscribir-,
                    asi que el enlace tiene que ser el texto mismo.
                  */
                  <button
                    type="button"
                    onClick={() =>
                      verEnvio(
                        lead,
                        oferta.tipo === 'retomar' ? oferta.ultimoPasoHecho : pasos.length,
                        oferta.tipo === 'desde-el-inicio' ? '' : oferta.desde,
                      )
                    }
                    title="Ver el mensaje que se le envió"
                    className="rounded text-primary underline decoration-dotted underline-offset-2 transition-colors hover:text-primary-hover"
                  >
                    {detectado}
                  </button>
                )}
              </span>
            );

          /*
            EN QUE PASO EMPIEZA. Es el numero del primer mensaje que va a
            recibir, no el de los que se dan por hechos: "empieza en el 2"
            significa que el 1 ya esta y que lo proximo que le llega es el 2.

            Se dice asi, y no como "desde el 2" o "saltar 1", porque es la
            unica forma de decirlo que no hay que traducir mentalmente al
            mirar la lista de pasos de al lado.

            El valor por defecto sale de lo detectado; el desplegable es el que
            faltaba para poder ponerlo a mano, que era imposible.
          */
          /*
            El valor por defecto NO puede ser el paso 1 cuando ya consta que
            recibio el ultimo: seria proponer volver a mandarle el primer
            mensaje a alguien que ya termino. En ese caso se propone
            `pasos.length + 1`, que es la opcion "ya recibió todo": deja la
            inscripcion registrada y cerrada, sin mandar nada.
          */
          const nadaPendiente = pasos.length + 1;
          const porDefecto =
            oferta.tipo === 'retomar'
              ? oferta.siguientePaso
              : oferta.tipo === 'ya-los-recibio-todos'
                ? nadaPendiente
                : 1;
          const empiezaEn = (lead.id ? pasoElegido.get(lead.id) : undefined) ?? porDefecto;
          const punto = lead.id ? puntos.get(lead.id) : undefined;
          const base = baseDelPaso(empiezaEn, punto);
          const vence = venceAlRetomar(
            base ?? ahora.toISOString(),
            esperaDelPaso(empiezaEn),
          );

          return (
            <ListRow as="div" key={lead.id}>
              <LeadIdentity className="min-w-0 flex-1" name={lead.name} caption={caption} />

              <div className="flex shrink-0 items-center gap-1">
                {/*
                  El desplegable no se pinta con un solo paso: elegir entre una
                  opcion es ruido.
                */}
                {pasos.length > 1 && !bloqueadoPor && (
                  <Select
                    value={empiezaEn}
                    onChange={(evento) =>
                      setPasoElegido((previo) => {
                        const siguiente = new Map(previo);
                        siguiente.set(lead.id!, Number(evento.target.value));
                        return siguiente;
                      })
                    }
                    compact
                    fullWidth={false}
                    aria-label={`Paso en el que empieza ${lead.name}`}
                    className="w-[104px]"
                  >
                    {pasos.map((paso) => (
                      <option key={paso.id} value={paso.stepOrder}>
                        Empieza {paso.stepOrder}
                      </option>
                    ))}
                    {/* Sin nada por mandar: se registra el paso por el flujo y
                        la inscripcion queda cerrada en el acto. Es la unica
                        opcion honesta para quien ya recibio el ultimo paso. */}
                    <option value={nadaPendiente}>Ya recibió todo</option>
                  </Select>
                )}

                <Button
                  size="sm"
                  variant="primary"
                  disabled={ocupado || bloqueadoPor !== undefined}
                  onClick={() => inscribir(lead, empiezaEn - 1, base)}
                  title={
                    bloqueadoPor
                      ? `Ya está en «${bloqueadoPor.flowName}», que es del mismo canal. Sacalo de ahí para poder inscribirlo aquí.`
                      : empiezaEn > pasos.length
                        ? 'Todos los pasos quedan como hechos y la inscripción se cierra: no se le manda nada.'
                        : `Los pasos anteriores al ${empiezaEn} quedan como hechos. El paso ${empiezaEn} queda pendiente para el ${FECHA_CORTA.format(vence)}.`
                  }
                >
                  {inscribiendo === lead.id ? '...' : bloqueadoPor ? 'Ya en flujo' : 'Inscribir'}
                </Button>
              </div>
            </ListRow>
          );
        })}
      </ListPanel>

      {/*
        LO QUE SE LE MANDO, en una hoja aparte.

        Anclada arriba como el resto de los dialogos que cambian de alto: el
        cuerpo de un mensaje mide lo que mide, y centrado el panel saltaria al
        pasar de uno corto a uno largo.
      */}
      {viendoEnvio && (
        <Modal
          onClose={() => setViendoEnvio(null)}
          maxWidth="480px"
          align="top"
          label={`Mensaje enviado a ${viendoEnvio.lead.name}`}
        >
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-section-title font-semibold text-ink">
                Paso {viendoEnvio.paso}
                {envio?.templateName ? ` · ${envio.templateName}` : ''}
              </h2>
              <p className="mt-0.5 text-micro text-ink-secondary">
                {viendoEnvio.lead.name}
                {envio ? ` · ${formatearFecha(envio.sentAt)}` : ''}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {cargandoEnvio ? (
                <p className="text-micro text-ink-muted">Buscando el mensaje...</p>
              ) : !envio ? (
                <p className="text-micro text-ink-muted">
                  No se encontró el registro de ese envío.
                </p>
              ) : envio.deletedAt ? (
                /* La 135 oculta el contenido de un envio borrado del historial,
                   pero el envio sigue existiendo. Se dice, en vez de mostrar
                   una hoja vacia que parece rota. */
                <p className="text-micro text-ink-muted">
                  El contenido de este envío se eliminó del historial. El mensaje sí se envió.
                </p>
              ) : envio.content ? (
                /* `whitespace-pre-wrap`: el mensaje se guardo con sus saltos de
                   linea y asi se mando. Colapsarlos mostraria otro mensaje. */
                <p className="whitespace-pre-wrap break-words text-body text-ink">
                  {envio.content}
                </p>
              ) : (
                /* Anterior a la 106: se registro el envio pero no su texto. */
                <p className="text-micro text-ink-muted">
                  Este envío es anterior a que se guardara una copia del mensaje, así que no
                  hay texto que mostrar.
                </p>
              )}
            </div>

            <div className="border-t border-line px-4 py-2.5">
              <Button
                variant="secondary"
                onClick={() => setViendoEnvio(null)}
                className="w-full font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
