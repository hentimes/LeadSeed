import { useState } from 'react';
import { CountBadge, IconButton, Input, Select } from '../../design';
import { Icon } from '../../utils/icons';
import SinNombreToggle from '../leads/SinNombreToggle';
import { ORDENES_DESTINATARIO, type CriterioDestinatario } from '../../utils/recipientSort';
import { CONTACTOS_DESTINATARIO, type CriterioContacto } from '../../utils/recipientContactFilter';
import type { EstadoDelResumen } from '../../hooks/useLeadSendSummary';

/**
 * LA BARRA DE FILTROS DE LA HOJA DE DESTINATARIOS
 *
 * ## Por que se pliega
 *
 * Llego a tener tres filas de controles -buscador, ver lista y orden, contacto
 * y mensaje- sobre una lista de ocho leads. Contando el rotulo de listas y sus
 * chips, la mitad de la hoja era maquinaria para mirar la otra mitad.
 *
 * Y casi nunca hacen falta las tres: el uso normal es abrir, buscar a alguien o
 * marcar de la lista tal cual viene, y cerrar. Los filtros son para la tanda
 * que se arma una vez, no para cada envio.
 *
 * Asi que en reposo queda UNA fila -buscar, ocultar sin nombre, y el embudo- y
 * el resto se despliega al pedirlo. El embudo lleva encima cuantos filtros hay
 * puestos, que es lo que hace que plegarlos no los esconda: si algo esta
 * filtrando, se ve sin abrir nada. Sin ese contador esto seria una trampa -la
 * lista mostraria menos leads de los que hay y nada lo explicaria-, y por eso
 * el contador no es un adorno sino la condicion para poder plegar.
 *
 * ## El orden tambien vive aca
 *
 * Ordenar no es filtrar, pero se decide en el mismo momento y con la misma
 * cabeza -"a quien le toca"-, asi que separarlo en otra fila fija habria
 * devuelto el problema que esto resuelve.
 */
/* Id fijo: hay una sola hoja de destinatarios abierta a la vez, asi que no hace
   falta generarlo, y fijo se lee mejor en el DOM. */
const PANEL_ID = 'filtros-destinatarios';

/**
 * Lo que dice el desplegable de mensaje cuando no se puede usar.
 *
 * El motivo estaba en una linea debajo del control, y esa linea sumaba un
 * renglon a una hoja que ya estaba apretada. Metido en la opcion visible dice
 * lo mismo, en el sitio donde se mira, y sin ocupar nada: un `select`
 * deshabilitado igual muestra el texto de su opcion elegida.
 *
 * Es ademas mas accesible que el `title` que habia antes, que en un control
 * deshabilitado no se dispara nunca.
 */
const MENSAJE_BLOQUEADO = 'Mensaje: elige antes “Ya escritos” o “Sin escribir”';

export function RecipientFilters({
  search,
  onSearchChange,
  sinNombre,
  ocultarSinNombre,
  onOcultarSinNombreChange,
  contacto,
  onContactoChange,
  plantillaFiltro,
  onPlantillaFiltroChange,
  plantillas,
  orden,
  onOrdenChange,
  estadoDelResumen,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  /** Cuantos leads sin nombre hay; a cero, el boton no se pinta. */
  sinNombre: number;
  ocultarSinNombre: boolean;
  onOcultarSinNombreChange: (valor: boolean) => void;
  contacto: CriterioContacto;
  onContactoChange: (criterio: CriterioContacto) => void;
  plantillaFiltro: string | null;
  onPlantillaFiltroChange: (id: string | null) => void;
  /** Plantillas del canal que se pueden ofrecer, ya filtradas y con nombre. */
  plantillas: { id: string; nombre: string }[];
  orden: CriterioDestinatario;
  onOrdenChange: (criterio: CriterioDestinatario) => void;
  /** Si el historial de envios ya se puede usar para filtrar. */
  estadoDelResumen: EstadoDelResumen;
}) {
  const [abierto, setAbierto] = useState(false);

  /*
   * EL CONTADOR CUENTA LO QUE ESCONDE LEADS Y ESTA PLEGADO. Nada mas.
   *
   * Contaba tambien el orden, y ordenar no esconde a nadie: la cifra subia a 1
   * por elegir "Ultimo envio" y se aprendia a ignorar, que es lo peor que le
   * puede pasar a un aviso. Los otros dos filtros de la pantalla -el buscador y
   * el de sin nombre- tampoco se cuentan, por el motivo contrario: sus
   * controles estan a la vista en la fila de arriba, y el de "ver una lista"
   * en la barra de abajo. Lo unico que queda escondido al plegar es esto.
   *
   * Que el orden no sume no lo deja invisible: el boton se pinta destacado en
   * cuanto hay algo tocado aqui dentro, contador o no.
   */
  const activos = (contacto !== 'todos' ? 1 : 0) + (plantillaFiltro !== null ? 1 : 0);
  const hayAlgoTocado = activos > 0 || orden !== 'nombre';

  /*
   * Sin el historial cargado no se puede preguntar por el historial.
   *
   * El mapa vacio de la carga -o de un fallo- significaria "a nadie se le
   * escribio nunca", y "sin escribir" devolveria la agenda entera. Apagar el
   * control mientras tanto cuesta unos milisegundos; no apagarlo cuesta mandar
   * el mismo mensaje dos veces.
   */
  const sinHistorial = estadoDelResumen !== 'listo';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          aria-label="Buscar destinatarios por nombre o teléfono"
          className="flex-1"
        />
        <SinNombreToggle
          count={sinNombre}
          ocultos={ocultarSinNombre}
          onToggle={() => onOcultarSinNombreChange(!ocultarSinNombre)}
        />
        {/* `relative` para que el contador se cuelgue de la esquina del boton. */}
        <div className="relative shrink-0">
          <IconButton
            icon={<Icon.Funnel />}
            label={abierto ? 'Ocultar los filtros' : 'Filtrar y ordenar'}
            variant={abierto || hayAlgoTocado ? 'secondary' : 'ghost'}
            onClick={() => setAbierto((estaba) => !estaba)}
            aria-expanded={abierto}
            aria-controls={PANEL_ID}
          />
          <CountBadge count={activos} />
        </div>
      </div>

      {abierto && (
        /* Dos columnas: el mensaje ocupa la fila entera porque su texto -el
           nombre de una plantilla- es el mas largo de los tres. */
        <div id={PANEL_ID} className="grid grid-cols-2 gap-1.5">
          <Select
            value={contacto}
            onChange={(evento) => {
              const siguiente = evento.target.value as CriterioContacto;
              onContactoChange(siguiente);
              // Volver a "todos" apaga tambien la plantilla: dejarla elegida
              // mostraria un filtro puesto que ya no filtra nada.
              if (siguiente === 'todos') onPlantillaFiltroChange(null);
            }}
            compact
            aria-label="Filtrar por si ya se le escribió"
            className="min-w-0"
            disabled={sinHistorial}
          >
            {CONTACTOS_DESTINATARIO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                Contacto: {opcion.label}
              </option>
            ))}
          </Select>

          <Select
            value={orden}
            onChange={(evento) => onOrdenChange(evento.target.value as CriterioDestinatario)}
            compact
            aria-label="Ordenar los destinatarios"
            className="min-w-0"
          >
            {ORDENES_DESTINATARIO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                Orden: {opcion.label}
              </option>
            ))}
          </Select>

          {/* Solo si hay plantillas que ofrecer: un desplegable con una unica
              opcion muerta es ruido. */}
          {plantillas.length > 0 && (
            <Select
              value={plantillaFiltro ?? ''}
              onChange={(evento) => onPlantillaFiltroChange(evento.target.value || null)}
              compact
              aria-label="Contar solo una plantilla como mensaje enviado"
              className="col-span-2 min-w-0"
              /* Deshabilitado con "Contacto: todos" a proposito: sin filtro de
                 contacto la plantilla no acota nada, y dejarlo activo
                 prometeria un filtro que no ocurre. El motivo lo dice la propia
                 opcion visible; ver `MENSAJE_BLOQUEADO`. */
              disabled={contacto === 'todos' || sinHistorial}
            >
              <option value="">
                {contacto === 'todos' ? MENSAJE_BLOQUEADO : 'Mensaje: Cualquiera'}
              </option>
              {plantillas.map((plantilla) => (
                <option key={plantilla.id} value={plantilla.id}>
                  Mensaje: {plantilla.nombre}
                </option>
              ))}
            </Select>
          )}

          {estadoDelResumen === 'error' && (
            <p className="col-span-2 text-micro text-state-danger-ink">
              No se pudo leer el historial de envíos, así que no se puede filtrar por
              contacto. Cierra y vuelve a abrir para reintentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
