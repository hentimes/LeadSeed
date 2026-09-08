import { useMemo, useState } from 'react';
import type { Lead, LeadList } from '../../types';
import { Badge, EmptyState, ListPagination, ListPanel, ListRow } from '../../design';
import { Icon } from '../../utils/icons';
import LeadIdentity from '../leads/LeadIdentity';
import { DATO_DEL_CANAL, type CanalContacto } from '../../utils/leadContacto';
import { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';
import type { LeadSendSummary } from '../../services/historyService';
import { ordenarDestinatarios, type CriterioDestinatario } from '../../utils/recipientSort';
import { filtrarPorContacto, type CriterioContacto } from '../../utils/recipientContactFilter';
import type { EstadoDelResumen } from '../../hooks/useLeadSendSummary';
import { RecipientFilters } from './RecipientFilters';
import { RecipientListChips } from './RecipientListBar';

/** Lo minimo que hace falta de una plantilla para resolver su categoria. */
interface PlantillaMinima {
  id?: string | number;
  /** Para el selector de "que mensaje". Opcional: el resto del picker no lo usa. */
  nombre?: string;
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
 *
 * Los controles viven en dos piezas aparte -`RecipientFilters` arriba y
 * `RecipientListBar` abajo- y aca queda lo que de verdad es esta pantalla: la
 * lista de personas y quien esta marcado.
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
 *
 * ## La cabecera y el pie tambien ocupan
 *
 * El alto se reservaba contando solo las ocho filas, pero se le daba a
 * `ListPanel`, que mete DENTRO de esa caja su cabecera y su pie. La paginacion
 * se comia unos 40px, asi que de las ocho filas entraban siete y pico: la
 * octava quedaba siempre debajo del corte y habia que scrollear para marcarla,
 * en cada pagina y con la barra a un pixel del borde.
 *
 * Por eso ahora se suman las tres partes. La alternativa -bajar a siete leads
 * por pagina- costaba una pagina mas cada siete leads sobre mil.
 */
const ALTO_DE_FILA = 53;
/** El `min-h-[34px]` de la cabecera de `ListPanel` mas su borde inferior. */
const ALTO_DE_CABECERA = 35;
/** El `py-1.5` del pie mas el alto de un boton de pagina (28px) mas el borde. */
const ALTO_DEL_PIE = 41;
const ALTO_DE_LISTA = LEADS_POR_PAGINA * ALTO_DE_FILA + ALTO_DE_CABECERA + ALTO_DEL_PIE;

export function RecipientPicker({
  leads,
  leadLists,
  selectedLeadIds,
  selectedListIds,
  onToggleLead,
  onToggleLeads,
  onToggleList,
  contactables,
  verListaId,
  search,
  onSearchChange,
  pagina,
  onPaginaChange,
  ocultarSinNombre,
  onOcultarSinNombreChange,
  sentLeadIds,
  resumenDeEnvios,
  estadoDelResumen,
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
  /** Marca o desmarca varios de una vez; lo usa la casilla de la pagina. */
  onToggleLeads: (ids: string[], seleccionar: boolean) => void;
  onToggleList: (id: number) => void;
  /**
   * Los leads que pueden recibir por este canal.
   *
   * Se calcula en la hoja y no aca porque el desplegable de listas -que vive en
   * el pie, junto a "Listo"- promete la misma cifra. Con dos calculos podian
   * decir cosas distintas; con uno, no.
   */
  contactables: Lead[];
  /** Ver solo una lista. Es filtro de VISTA: no toca la seleccion del envio. */
  verListaId: number | null;
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
  /** Si ese resumen ya se puede usar para filtrar. Ver `useLeadSendSummary`. */
  estadoDelResumen: EstadoDelResumen;
  /** Abre el historial de un lead. La hoja cambia de vista, no abre otro dialogo. */
  onVerHistorial: (leadId: string) => void;
  /** Para resolver a que categoria pertenece la plantilla del ultimo envio. */
  plantillas?: PlantillaMinima[];
  categorias?: CategoriaMinima[];
  canal?: CanalContacto;
}) {
  /*
   * Los que quedaron fuera por no poder recibir por este canal.
   *
   * Antes se listaban todos y la fila se limitaba a poner "Sin telefono" bajo
   * el nombre, pero la casilla se dejaba marcar igual: el envio salia con
   * destinatarios incapaces de recibirlo. Peor todavia, marcar una lista metia
   * a todos sus leads sin pasar por aqui.
   */
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

  /*
   * A QUIEN YA LE ESCRIBI.
   *
   * Dos controles que se leen juntos: `contacto` dice si se quieren los ya
   * escritos o los que faltan, y `plantillaFiltro` acota que cuenta como
   * escrito. Con "cualquier mensaje" la pregunta es haber recibido algo; con
   * una plantilla elegida, haber recibido ESA.
   *
   * La combinacion util es la segunda: deja pedir "los que todavia no
   * recibieron el primer contacto" aunque ya hayan recibido otras cosas, que es
   * lo que evita mandar el mismo mensaje dos veces. La regla vive en
   * `recipientContactFilter` y esta probada aparte.
   */
  const [contacto, setContacto] = useState<CriterioContacto>('todos');
  const [plantillaFiltro, setPlantillaFiltro] = useState<string | null>(null);

  /** Solo las plantillas nombradas: sin nombre no hay nada que ofrecer. */
  const plantillasFiltrables = useMemo(
    () =>
      plantillas
        .filter((plantilla) => plantilla.id != null && plantilla.nombre)
        .map((plantilla) => ({ id: String(plantilla.id), nombre: plantilla.nombre as string })),
    [plantillas],
  );
  const nombreDelFiltro = plantillasFiltrables.find(
    (plantilla) => plantilla.id === plantillaFiltro,
  )?.nombre;

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
    result = filtrarPorContacto(result, contacto, plantillaFiltro, resumenDeEnvios);
    return ordenarDestinatarios(
      result,
      orden,
      resumenDeEnvios,
      (r) => categoriaDelResumen(r)?.name ?? '',
    );
  }, [
    contactables,
    verListaId,
    search,
    ocultarSinNombre,
    contacto,
    plantillaFiltro,
    orden,
    resumenDeEnvios,
    categoriaDelResumen,
  ]);

  /**
   * QUIEN ENTRA AL ENVIO POR UNA LISTA, SIN HABERLO MARCADO.
   *
   * El envio no son los leads marcados: es la UNION de los marcados con todos
   * los de las listas agregadas -asi lo calcula el sender-. La fila, en cambio,
   * se pintaba solo con `selectedLeadIds`, asi que agregar una lista de 412
   * dejaba 412 filas con la casilla VACIA y el mensaje les llegaba igual. Y
   * tocar esa casilla no los sacaba: `toggleLead` no toca las listas.
   *
   * O sea, la casilla decia que no y el envio decia que si, en la unica
   * pantalla donde equivocarse cuesta un mensaje a alguien que no querias.
   *
   * Ahora la fila dice la verdad: marcada y bloqueada, con el motivo en el
   * tooltip. Para sacarlo hay que quitar la lista, que es donde entro.
   */
  const listaQueIncluye = (lead: Lead): LeadList | undefined =>
    leadLists.find((lista) => lista.id != null && selectedListIds.has(lista.id) && lead.listaIds.includes(lista.id));

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
  const filtroActual = `${search}|${ocultarSinNombre}|${verListaId ?? ''}|${orden}|${contacto}|${plantillaFiltro ?? ''}`;
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

  /*
   * MARCAR LA PAGINA ENTERA.
   *
   * Se aplica a los OCHO que se estan viendo, no a los que deja el filtro:
   * "marcar los 378 que quedaron" desde una casilla pequena es demasiado poder
   * para un clic sin confirmacion, y para sumar de a cientos ya esta la barra
   * de listas, que dice cuantos suma antes de pulsarla.
   *
   * La casilla tiene tres estados y el tercero importa: con algunos marcados se
   * pinta indeterminada, que es lo que distingue "marque tres a mano" de "esta
   * pagina esta entera". Sin el, la casilla mentiria en cuanto tocaras una fila.
   */
  const idsVisibles = visibles.map((lead) => lead.id).filter((id): id is string => Boolean(id));
  /* Los que se pueden alternar: los que entraron por una lista no, su casilla
     esta bloqueada y marcarla o desmarcarla no haria nada. */
  const idsAlternables = visibles
    .filter((lead) => lead.id && !listaQueIncluye(lead))
    .map((lead) => lead.id as string);
  const sueltosMarcados = idsAlternables.filter((id) => selectedLeadIds.has(id)).length;
  const paginaEntera = idsAlternables.length > 0 && sueltosMarcados === idsAlternables.length;
  /* La cifra de la cabecera cuenta los que de verdad van a recibir el mensaje,
     no los marcados a mano: con una lista agregada, decir "0 marcados" mientras
     el pie dice "Listo (412)" son dos numeros que se contradicen. */
  const enElEnvio = visibles.filter(
    (lead) => (lead.id && selectedLeadIds.has(lead.id)) || listaQueIncluye(lead),
  ).length;

  /*
   * Los textos de aviso, cortos a proposito: entran los dos en una linea de
   * 470px. "378 leads sin telefono valido quedan fuera de este envio" decia lo
   * mismo con el triple de palabras.
   */
  const avisos: string[] = [];
  if (contacto !== 'todos') {
    const cuantos = filteredLeads.length;
    const conPlantilla = nombreDelFiltro ? `«${nombreDelFiltro}»` : null;
    avisos.push(
      contacto === 'contactados'
        ? `${cuantos} ${conPlantilla ? `con ${conPlantilla}` : 'ya escritos'}`
        : `${cuantos} ${conPlantilla ? `sin ${conPlantilla}` : 'sin escribir'}`,
    );
  }
  if (descartados > 0) {
    avisos.push(`${descartados} sin ${DATO_DEL_CANAL[canal]} quedan fuera`);
  }

  return (
    /*
     * El orden cambio el 2026-08-20. Los chips de listas estaban arriba, entre
     * el titulo del paso y el buscador, asi que empujaban la lista hacia abajo
     * y con varias listas la dejaban fuera de la vista. Ahora la lista va
     * primero -que es lo que se viene a hacer- y los controles de listas quedan
     * debajo, como refinamiento.
     */
    <div className="flex min-h-0 flex-col gap-2">
      <RecipientFilters
        search={search}
        onSearchChange={onSearchChange}
        sinNombre={sinNombre}
        ocultarSinNombre={ocultarSinNombre}
        onOcultarSinNombreChange={onOcultarSinNombreChange}
        contacto={contacto}
        onContactoChange={setContacto}
        plantillaFiltro={plantillaFiltro}
        onPlantillaFiltroChange={setPlantillaFiltro}
        plantillas={plantillasFiltrables}
        orden={orden}
        onOrdenChange={setOrden}
        estadoDelResumen={estadoDelResumen}
      />

      {/*
        LOS AVISOS, EN UN SOLO RENGLON.

        Son dos cosas distintas -cuantos deja el filtro de contacto y cuantos no
        pueden recibir por este canal- y estaban en dos parrafos. Los dos son
        ciertos a la vez, asi que en la practica eran dos renglones fijos sobre
        una lista que ya peleaba por el alto.

        Se juntan con un punto medio y se recortan a una linea. Ninguno de los
        dos merece un renglon propio: son cifras de contexto, no instrucciones.
        Callarlos no era opcion -filtrar en silencio deja a quien mira
        preguntandose donde estan sus leads- pero decirlos en dos lineas era
        cobrarle a la lista el precio de una explicacion.
      */}
      {avisos.length > 0 && (
        <p className="truncate text-micro text-ink-muted" title={avisos.join(' · ')}>
          {avisos.join(' · ')}
        </p>
      )}

      {/*
        Cuantos quedaron, para quien no ve la lista.
        
        Va siempre montado y no dentro de los avisos de arriba: una region viva
        que aparece y desaparece del DOM no la anuncian todos los lectores de
        pantalla la primera vez. `polite` porque es contexto, no una alerta, y
        no debe cortar a alguien que esta escribiendo en el buscador.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {filteredLeads.length} {filteredLeads.length === 1 ? 'destinatario' : 'destinatarios'} en
        la lista
      </p>

      {/* El alto va en un envoltorio y no en `ListPanel`: es un valor calculado,
          y una clase de Tailwind armada en tiempo de ejecucion no genera CSS
          -lo detecta `npm run check:classes`-.

          `maxHeight` en vh acompana al alto fijo: en una ventana baja los 500px
          no caben y la hoja entera nacia con scroll. Con el tope, lo que se
          recorta es la lista -que ya tiene su propio scroll y su paginacion- y
          no el dialogo. Sigue sin moverse al filtrar, que es lo que el alto
          fijo vino a resolver: el tope depende del viewport, no del contenido. */}
      <div className="min-h-0 shrink" style={{ height: ALTO_DE_LISTA, maxHeight: '58vh' }}>
        <ListPanel
          className="h-full"
          /* El alto lo fija el envoltorio de arriba, asi que esta lista si
             scrollea por dentro y vive dentro de la hoja, que tambien scrollea. */
          cortarScroll
          title={
            <label className="flex cursor-pointer items-center gap-2 normal-case">
              <input
                type="checkbox"
                checked={paginaEntera}
                ref={(elemento) => {
                  if (elemento) elemento.indeterminate = sueltosMarcados > 0 && !paginaEntera;
                }}
                onChange={() => onToggleLeads(idsAlternables, !paginaEntera)}
                disabled={idsAlternables.length === 0}
                /* El estado intermedio necesita decirse: `indeterminate` es una
                   propiedad del DOM sin equivalente ARIA, y varios lectores de
                   pantalla la anuncian igual que "sin marcar". Sin esto, marcar
                   tres a mano sonaba idéntico a no haber marcado ninguno. */
                aria-label={
                  paginaEntera
                    ? `Desmarcar los ${idsAlternables.length} de esta página`
                    : sueltosMarcados > 0
                      ? `${sueltosMarcados} de ${idsAlternables.length} marcados. Marcar los que faltan de esta página`
                      : `Marcar los ${idsAlternables.length} de esta página`
                }
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
              />
              Esta página ({idsVisibles.length})
            </label>
          }
          count={enElEnvio > 0 ? `${enElEnvio} en el envío` : undefined}
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
            const porLista = listaQueIncluye(lead);
            const checked = porLista !== undefined || selectedLeadIds.has(lead.id!);
            const secondary = canal === 'email' ? lead.email : lead.phone;
            const resumenDelLead = lead.id ? resumenDeEnvios.get(lead.id) : undefined;
            const categoriaDelUltimo = resumenDelLead ? categoriaDelResumen(resumenDelLead) : undefined;
            return (
              /*
                La fila ya no es el `label`. Lo era, y eso metia el boton del
                historial DENTRO de la etiqueta de una casilla: un control
                interactivo anidado en otro, que algunos lectores de pantalla y
                el control por voz colapsan en un solo elemento y dejan el boton
                sin su rol. Ahora el `label` cubre casilla y nombre -que es la
                zona que se toca para marcar- y el boton queda al lado.
              */
              <ListRow key={lead.id} isSelected={checked}>
                <label
                  className={`flex min-w-0 flex-1 items-center gap-2 ${
                    porLista ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  title={
                    porLista
                      ? `Va incluido por la lista «${porLista.name}». Quitá la lista para sacarlo.`
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLead(lead.id!)}
                    disabled={porLista !== undefined}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)] disabled:cursor-default"
                  />
                  <LeadIdentity
                    className="min-w-0 flex-1"
                    name={lead.name}
                    caption={secondary}
                  />
                </label>

                {/*
                  Lo que ya se le envio. Va a la derecha y en dos lineas: arriba
                  cuantos y cuando -los dos datos que se comparan de un vistazo
                  entre filas- y abajo con que plantilla.

                  Sustituye a la pastilla "Enviado", que solo decia si o no. Con
                  un contador, la ausencia de contador ya significa "ninguno",
                  asi que la pastilla pasaba a repetir informacion.
                */}
                {resumenDelLead ? (
                  /*
                    `button` y no `span`: abre el historial del lead. Va dentro
                    de un `label` que marca la casilla, asi que necesita cortar
                    la propagacion o tocar el historial marcaria el destinatario.
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

      {/* Lo ya agregado va pegado a la lista que describe. El desplegable con
          el que se agrega vive en el pie, junto a "Listo". */}
      <RecipientListChips
        leadLists={leadLists}
        contactables={contactables}
        selectedListIds={selectedListIds}
        onToggleList={onToggleList}
      />
    </div>
  );
}
