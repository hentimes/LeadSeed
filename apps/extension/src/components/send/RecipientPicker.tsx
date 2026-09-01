import { useMemo, useState } from 'react';
import type { Lead, LeadList } from '../../types';
import { Badge, EmptyState, Input, ListPagination, ListPanel, ListRow, Select } from '../../design';
import { Icon } from '../../utils/icons';
import LeadIdentity from '../leads/LeadIdentity';
import { puedeRecibirPor, DATO_DEL_CANAL, type CanalContacto } from '../../utils/leadContacto';
import SinNombreToggle, { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';
import type { LeadSendSummary } from '../../services/historyService';
import {
  ORDENES_DESTINATARIO,
  ordenarDestinatarios,
  type CriterioDestinatario,
} from '../../utils/recipientSort';

/** Lo minimo que hace falta de una plantilla para resolver su categoria. */
interface PlantillaMinima {
  id?: string | number;
  templateListIds?: number[];
}
interface CategoriaMinima {
  id?: number;
  name: string;
  color: string;
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' });

/**
 * Seleccion de destinatarios por lista y por lead suelto.
 *
 * Estaba duplicado entre `WhatsAppSender` y `EmailSender` con la unica
 * diferencia del color del foco y del dato secundario del tooltip.
 *
 * Dos cambios respecto de la version anterior:
 *
 * 1. Las dos columnas fijas (`grid-cols-2` con `h-48`) dejaban ~150px por
 *    columna en un panel de 320px, donde no entra ni el nombre de una lista.
 *    Ahora las listas son chips que fluyen y los leads ocupan el ancho.
 * 2. El dato secundario del lead se muestra en linea. Antes vivia en un
 *    tooltip posicionado con `left-full`, es decir, fuera del panel: en el
 *    side panel de Chrome no hay nada a la derecha, asi que no se veia.
 */
/** Cuantos leads por pagina en el selector de destinatarios. */
const LEADS_POR_PAGINA = 8;

/**
 * Alto reservado para la lista, SIEMPRE, aunque el filtro deje dos leads.
 *
 * Sin esto el dialogo cambiaba de alto con cada busqueda: escribir una letra
 * encogia la caja, el boton "Listo" saltaba hacia arriba y lo que estabas por
 * tocar se movia de sitio. Reservar el sitio de una pagina completa cuesta un
 * hueco vacio en el peor caso y a cambio la pantalla deja de moverse.
 *
 * 53px por fila sale de `ListRow` en densidad normal con dos lineas a cada lado
 * -nombre sobre telefono, contador sobre plantilla-. Si cambia el contenido de
 * la fila hay que volver a medir: es un numero acoplado al diseno, y por eso
 * vive aca arriba con su motivo y no incrustado en una clase.
 */
const ALTO_DE_FILA = 53;
const ALTO_DE_LISTA = LEADS_POR_PAGINA * ALTO_DE_FILA;

export function RecipientPicker({
  leads,
  leadLists,
  selectedLeadIds,
  selectedListIds,
  onToggleLead,
  onToggleList,
  onClear,
  search,
  onSearchChange,
  pagina,
  onPaginaChange,
  ocultarSinNombre,
  onOcultarSinNombreChange,
  sentLeadIds,
  resumenDeEnvios,
  onVerHistorial,
  plantillas = [],
  categorias = [],
  /**
   * Canal del envio. Decide dos cosas a la vez: que dato se pinta bajo el
   * nombre y, sobre todo, que leads se listan. Antes era `secondaryField` y
   * solo decidia lo primero.
   */
  canal = 'whatsapp',
}: {
  leads: Lead[];
  leadLists: LeadList[];
  selectedLeadIds: Set<string>;
  selectedListIds: Set<number>;
  onToggleLead: (id: string) => void;
  onToggleList: (id: number) => void;
  onClear: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  /**
   * La pagina la guarda quien abre la hoja, no la hoja.
   *
   * Se cerraba y volvia a la 1. Enviando de a uno -misma plantilla, otro
   * contacto- eso obliga a repaginar hasta la 8 en cada envio. La busqueda ya
   * subia por este mismo motivo; la pagina se habia quedado atras.
   */
  pagina: number;
  onPaginaChange: (pagina: number) => void;
  ocultarSinNombre: boolean;
  onOcultarSinNombreChange: (valor: boolean) => void;
  sentLeadIds: Set<string>;
  /** Que se le envio a cada lead. Vacio mientras carga; la lista se pinta igual. */
  resumenDeEnvios: Map<string, LeadSendSummary>;
  /** Abre el historial de un lead. La hoja cambia de vista, no abre otro dialogo. */
  onVerHistorial: (leadId: string) => void;
  /** Para resolver a que categoria pertenece la plantilla del ultimo envio. */
  plantillas?: PlantillaMinima[];
  categorias?: CategoriaMinima[];
  canal?: CanalContacto;
}) {
  /*
   * Se listan solo los leads que pueden recibir por este canal.
   *
   * Antes se listaban todos y la fila se limitaba a poner "Sin telefono" bajo
   * el nombre, pero la casilla se dejaba marcar igual: el envio salia con
   * destinatarios incapaces de recibirlo. Peor todavia, marcar una lista metia
   * a todos sus leads sin pasar por aqui.
   */
  const contactables = useMemo(
    () => leads.filter((lead) => puedeRecibirPor(lead, canal)),
    [leads, canal],
  );
  const descartados = leads.length - contactables.length;

  /*
   * Ocultar los leads sin nombre. Apagado por defecto: esconder datos sin que
   * nadie lo pida es como se pierden contactos de vista.
   *
   * Usa `nombreVisible` en vez de comprobar la cadena a mano, asi "sin nombre"
   * significa lo mismo aqui que en la fila que lo pinta -incluido el caso del
   * nombre que es solo espacios, que hay en los leads importados-.
   */
  const sinNombre = useMemo(() => contarSinNombre(contactables), [contactables]);

  /*
   * VER SOLO UNA LISTA. Es filtro de vista y nada mas: no toca la seleccion.
   *
   * Antes esto no existia y el filtrado lo hacia `selectedListIds`, el mismo
   * estado con el que se AGREGAN listas enteras al envio. Un unico estado con
   * dos significados: mirar y elegir. Ahora son dos, y cada control hace una
   * sola cosa.
   */
  const [verListaId, setVerListaId] = useState<number | null>(null);

  /**
   * La categoria del ultimo envio.
   *
   * No viene de la base: se cruza el `template_id` guardado en el envio con las
   * plantillas que la pantalla ya tiene cargadas. Hacerlo en el servidor habria
   * pedido un join mas por una etiqueta que aqui ya esta disponible gratis.
   *
   * Una plantilla puede estar en varias categorias; se muestra la primera. Con
   * dos etiquetas la fila deja de leerse, y para eso esta el historial completo.
   */
  const categoriaDelResumen = useMemo(() => {
    const porPlantilla = new Map<string, CategoriaMinima>();
    for (const plantilla of plantillas) {
      const primera = (plantilla.templateListIds || [])[0];
      const categoria = categorias.find((c) => c.id === primera);
      if (plantilla.id != null && categoria) porPlantilla.set(String(plantilla.id), categoria);
    }
    return (resumen: LeadSendSummary): CategoriaMinima | undefined =>
      resumen.lastTemplateId ? porPlantilla.get(resumen.lastTemplateId) : undefined;
  }, [plantillas, categorias]);

  const [orden, setOrden] = useState<CriterioDestinatario>('nombre');

  const filteredLeads = useMemo(() => {
    let result = contactables;
    if (verListaId !== null) {
      result = result.filter((lead) => lead.listaIds.includes(verListaId));
    }
    result = result.filter((lead) => pasaFiltroDeNombre(lead, ocultarSinNombre));
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (lead) => lead.name.toLowerCase().includes(query) || (lead.phone || '').includes(query),
      );
    }
    return ordenarDestinatarios(
      result,
      orden,
      resumenDeEnvios,
      (r) => categoriaDelResumen(r)?.name ?? '',
    );
  }, [contactables, verListaId, search, ocultarSinNombre, orden, resumenDeEnvios, categoriaDelResumen]);

  const hasSelection = selectedLeadIds.size > 0 || selectedListIds.size > 0;

  /*
   * Paginacion. Antes se pintaban los mil leads de golpe dentro de un alto fijo
   * de `max-h-52`: el navegador montaba mil filas para ensenar cuatro, y para
   * llegar al lead 900 habia que arrastrar la barra a ciegas.
   */
  const setPagina = onPaginaChange;
  const totalPaginas = Math.max(1, Math.ceil(filteredLeads.length / LEADS_POR_PAGINA));

  /*
   * Al cambiar el filtro, la pagina 7 puede dejar de existir, asi que se vuelve
   * a la primera. Se hace ajustando el estado durante el render y no desde un
   * `useEffect`: reiniciarlo en un efecto pinta primero la pagina vieja con el
   * filtro nuevo y despues corrige, que es un render en cascada visible. Es el
   * patron que React documenta para estado derivado de props.
   */
  const filtroActual = `${search}|${ocultarSinNombre}|${verListaId ?? ''}|${orden}`;
  const [filtroAnterior, setFiltroAnterior] = useState(filtroActual);
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setPagina(1);
  }

  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filteredLeads.slice(
    (paginaActual - 1) * LEADS_POR_PAGINA,
    paginaActual * LEADS_POR_PAGINA,
  );

  return (
    /*
     * El orden cambio el 2026-08-20. Los chips de listas estaban arriba, entre
     * el titulo del paso y el buscador, asi que empujaban la lista hacia abajo
     * y con varias listas la dejaban fuera de la vista. Ahora la lista va
     * primero -que es lo que se viene a hacer- y los filtros por lista quedan
     * debajo, como refinamiento.
     */
    <div className="flex min-h-0 flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="flex-1"
        />
        <SinNombreToggle
          count={sinNombre}
          ocultos={ocultarSinNombre}
          onToggle={() => onOcultarSinNombreChange(!ocultarSinNombre)}
        />
      </div>

      {/*
        Filtro de VISTA. Deliberadamente separado de los chips de abajo, que
        agregan al envio. Este solo decide a quien mirar.
      */}
      <div className="flex items-center gap-1.5">
        {leadLists.length > 0 && (
          <Select
            value={verListaId ?? ''}
            onChange={(evento) => setVerListaId(evento.target.value ? Number(evento.target.value) : null)}
            compact
            aria-label="Ver solo los leads de una lista"
            className="min-w-0 flex-1"
          >
            <option value="">Ver: todas las listas</option>
            {leadLists.map((lista) => (
              <option key={lista.id} value={lista.id}>
                Ver: {lista.name}
              </option>
            ))}
          </Select>
        )}

        {/* Ordenar por lo que se le envio antes: es la pregunta que trae a
            alguien a esta pantalla -a quien le toca- y no se podia contestar. */}
        <Select
          value={orden}
          onChange={(evento) => setOrden(evento.target.value as CriterioDestinatario)}
          compact
          aria-label="Ordenar los destinatarios"
          className="min-w-0 flex-1"
        >
          {ORDENES_DESTINATARIO.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              Orden: {opcion.label}
            </option>
          ))}
        </Select>
      </div>

      {/*
        Se dice cuantos quedaron fuera y por que. Filtrar en silencio deja a
        quien mira preguntandose donde estan sus leads.
      */}
      {descartados > 0 && (
        <p className="text-micro text-ink-muted">
          {descartados} {descartados === 1 ? 'lead sin' : 'leads sin'} {DATO_DEL_CANAL[canal]} valido
          {descartados === 1 ? ' queda' : ' quedan'} fuera de este envio.
        </p>
      )}

      {/*
        Antes esto iba con `flush` y `-mx-3`, o sea con margen negativo para
        salir del relleno de la tarjeta del paso y apoyarse en su borde. Era un
        apano para no dibujar dos cajas anidadas, y el efecto real era que la
        lista se veia incrustada a la fuerza dentro de otra cosa: eso es lo que
        el usuario describio como una lista "atravesada".

        Aca ya no hace falta ningun apano: la lista dejo de estar dentro de una
        tarjeta. Es el contenido principal de su propia hoja, con su borde
        propio y sin margenes negativos.

        Sin rotulo: "Leads directos" repetia lo que el titulo de la hoja ya dice.
      */}
      {/* El alto va en un envoltorio y no en `ListPanel`: es un valor calculado,
          y una clase de Tailwind armada en tiempo de ejecucion no genera CSS
          -lo detecta `npm run check:classes`-. */}
      <div className="shrink-0" style={{ height: ALTO_DE_LISTA }}>
      <ListPanel
        className="h-full"
        footer={
          <ListPagination page={paginaActual} pageCount={totalPaginas} onPageChange={setPagina} />
        }
        empty={
          <EmptyState
            icon={<Icon.Search />}
            title="Sin resultados"
            description={search ? 'Probá con otro nombre o número.' : 'No hay leads en esta selección.'}
          />
        }
      >
        {visibles.map((lead) => {
          const checked = selectedLeadIds.has(lead.id!);
          const secondary = canal === 'email' ? lead.email : lead.phone;
          const resumenDelLead = lead.id ? resumenDeEnvios.get(lead.id) : undefined;
          const categoriaDelUltimo = resumenDelLead ? categoriaDelResumen(resumenDelLead) : undefined;
          return (
            <ListRow as="label" key={lead.id} isSelected={checked} className="cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleLead(lead.id!)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
              />
              <LeadIdentity
                className="min-w-0 flex-1"
                name={lead.name}
                caption={secondary}
              />

              {/*
                Lo que ya se le envio. Va a la derecha y en dos lineas: arriba
                cuantos y cuando -los dos datos que se comparan de un vistazo
                entre filas- y abajo con que plantilla.

                Sustituye a la pastilla "Enviado", que solo decia si o no. Con
                un contador, la ausencia de contador ya significa "ninguno", asi
                que la pastilla pasaba a repetir informacion.
              */}
              {resumenDelLead ? (
                /*
                  `button` y no `span`: abre el historial del lead. Va dentro de
                  un `label` que marca la casilla, asi que necesita cortar la
                  propagacion o tocar el historial marcaria el destinatario.
                */
                <button
                  type="button"
                  onClick={(evento) => {
                    evento.preventDefault();
                    evento.stopPropagation();
                    if (lead.id) onVerHistorial(lead.id);
                  }}
                  title={`Ver los ${resumenDelLead.total} mensajes enviados a ${lead.name}`}
                  className="flex shrink-0 flex-col items-end gap-0.5 rounded-md px-1 py-0.5 text-right transition-colors hover:bg-surface-sunken"
                >
                  <span className="flex items-center gap-1">
                    <span className="rounded-full bg-surface-sunken px-1.5 text-micro font-semibold tabular-nums text-ink-secondary">
                      {resumenDelLead.total}
                    </span>
                    <span className="text-micro tabular-nums text-ink-secondary">
                      {FECHA_CORTA.format(new Date(resumenDelLead.lastSentAt))}
                    </span>
                  </span>
                  {resumenDelLead.lastTemplateName && (
                    <span className="flex max-w-[124px] items-center gap-1">
                      {categoriaDelUltimo && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: categoriaDelUltimo.color }}
                        />
                      )}
                      <span className="truncate text-micro text-ink-secondary">
                        {resumenDelLead.lastTemplateName}
                      </span>
                    </span>
                  )}
                </button>
              ) : (
                sentLeadIds.has(lead.id!) && (
                  <Badge tone="success" className="shrink-0">Enviado</Badge>
                )
              )}
            </ListRow>
          );
        })}
      </ListPanel>
      </div>

      {/*
        AGREGAR UNA LISTA ENTERA. Ojo con el rotulo: esto NO filtra.

        Decia "Filtrar por lista" y hacia dos cosas a la vez. Filtraba la vista,
        si -por eso el rotulo sonaba razonable-, pero ademas `selectedListIds`
        se lee en los tres senders para hacer la UNION de los leads sueltos con
        TODOS los leads de esas listas. O sea que tocabas un chip creyendo que
        acotabas lo que veias, y sumabas cuatrocientos destinatarios al envio.

        El rotulo ahora dice lo que pasa, y cada chip activo muestra cuantos
        agrego. Un control que promete una cosa y hace otra, en la pantalla que
        dispara mensajes a cientos de personas, es lo mas caro que habia aca.
      */}
      {leadLists.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-micro font-medium text-ink-secondary">
              Agregar lista completa
            </span>
            {hasSelection && (
              <button
                onClick={onClear}
                className="text-micro font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {leadLists.map((list) => {
              const on = selectedListIds.has(list.id!);
              const count = contactables.filter((lead) => lead.listaIds.includes(list.id!)).length;
              return (
                <button
                  key={list.id}
                  onClick={() => onToggleList(list.id!)}
                  aria-pressed={on}
                  aria-label={`${on ? 'Quitar' : 'Agregar'} los ${count} leads de ${list.name}`}
                  className={`flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro font-medium transition-colors ${
                    on
                      ? 'border-transparent text-ink-inverse'
                      : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
                  }`}
                  // El color lo elige el usuario al crear la lista: es dato,
                  // no estilo. Es una de las excepciones que documenta el
                  // README del sistema de diseno.
                  style={on ? { backgroundColor: list.color } : undefined}
                >
                  <span className="max-w-[120px] truncate">{list.name}</span>
                  {/* El signo importa: dice que suma, no que acota. */}
                  <span className={`tabular-nums ${on ? 'opacity-75' : 'text-ink-muted'}`}>
                    +{count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
