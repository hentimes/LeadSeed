import { Icon } from '../../utils/icons';
import { STATUS_COLORS } from '../../design/leadColors';
import { nombreVisible } from '../../utils/leadDisplay';
import { STAGE_ACTIONS, STATUS_LABELS, type Lead, type LeadStatus, type PipelineStage } from '../../types';

/** Cuantos leads se asoman dentro del cuadrante. */
const FICHAS_VISIBLES = 4;

/**
 * UN CUADRANTE DEL TABLERO
 *
 * ## El error que corrige
 *
 * La version anterior era **un solo `<button>`** y los nombres de adentro eran
 * `<span>` decorativos. Por eso no se podia mover nada: un cuadrante donde los
 * leads son texto pintado es un cartel, no un tablero.
 *
 * Ahora cada lead es una ficha propia: un `<button draggable>`. Se puede
 * arrastrar con el raton y abrir con Enter o con el dedo, que es lo mismo que
 * hace falta para moverlo sin arrastrar.
 *
 * La cabecera dejo de ser clicable a proposito. Cuando toda la tarjeta era un
 * boton no habia forma de saber que pasaba al tocar cada zona; ahora solo son
 * interactivas las fichas y el pie, y cada uno hace una cosa.
 *
 * ## El asa
 *
 * `Icon.Grip`, siempre visible y a contraste pleno (4.77:1 en claro, 4.51 en
 * oscuro). La version vieja usaba `|||` -tres barras ASCII- y solo aparecia al
 * pasar el raton, o sea que en tactil no existia. Sin una senal permanente, lo
 * unico que dice que una ficha se agarra es el cursor, que aparece cuando ya
 * apuntaste.
 *
 * ## Que se asoma y que no
 *
 * Cuatro fichas y nada de scroll interno. Los scrollbars estan ocultos en todo
 * el producto, asi que una lista con scroll dentro de 162px esconderia leads sin
 * ninguna pista. El cuadrante asoma cuatro; el pie dice cuantos hay de verdad y
 * abre la lista completa.
 *
 * ## Nada cambia de tamano al arrastrar por encima
 *
 * Ni `scale-`, ni fichas que se van del flujo. Cualquiera de las dos corre de
 * sitio los otros destinos justo mientras estas apuntando: es el mismo fallo
 * que `ListPagination` documenta para sus flechas.
 */
export function PipelineStageCard({
  estado,
  leads,
  total,
  trabados,
  esDestinoDelArrastre,
  leadArrastrado,
  onAbrirLista,
  onAccionesDeLead,
  onDragStartLead,
  onDragEndLead,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  estado: LeadStatus;
  /** Los que se asoman: ya vienen recortados y ordenados por quien lo monta. */
  leads: Lead[];
  /** Cuantos de la etapa llevan demasiado tiempo sin moverse. */
  trabados: number;
  /** Cuantos hay en la etapa en total, que puede ser mucho mas que los visibles. */
  total: number;
  esDestinoDelArrastre: boolean;
  /** Id del lead que se esta arrastrando, para vaciar su ficha sin moverla. */
  leadArrastrado: string | null;
  onAbrirLista: () => void;
  onAccionesDeLead: (lead: Lead) => void;
  onDragStartLead: (lead: Lead) => void;
  onDragEndLead: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const accion = STAGE_ACTIONS[estado as PipelineStage];

  return (
    <div
      onDragOver={(evento) => {
        evento.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(evento) => {
        evento.preventDefault();
        onDrop();
      }}
      className={`flex flex-col overflow-hidden rounded-md border bg-surface shadow-card transition-colors ${
        esDestinoDelArrastre
          ? 'border-transparent bg-primary-soft ring-2 ring-inset ring-primary-ink'
          : 'border-line'
      }`}
    >
      {/* La franja: el unico uso del color de estado. Identifica; no informa. */}
      <span aria-hidden="true" className="h-1 w-full shrink-0" style={{ backgroundColor: STATUS_COLORS[estado] }} />

      <div className="px-2 pb-1 pt-2">
        <div className="flex items-center justify-between gap-1">
          <span className="min-w-0 truncate text-meta font-semibold text-ink">{STATUS_LABELS[estado]}</span>
          <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-micro font-semibold tabular-nums text-ink-secondary">
            {total}
          </span>
        </div>

        {/*
          EL VERBO. Sale de la matriz de Eisenhower, donde cada cuadrante no dice
          donde esta la tarea sino que hacer con ella. Los nuestros solo decian
          donde estaba el lead, que es informacion pero no es trabajo.

          Solo lo llevan las dos etapas abiertas: 'convertido' y 'descartado' son
          finales y no piden nada.
        */}
        {accion?.verbo && (
          <p className="mt-0.5 truncate text-micro text-ink-secondary">{accion.verbo}</p>
        )}

        {/*
          Los trabados. Un cuadrante desbordado avisa de que algo no avanza; el
          numero por si solo no lo dice.
        */}
        {trabados > 0 && (
          <p className="mt-0.5 truncate text-micro font-medium text-state-warning-ink">
            {trabados} sin moverse
          </p>
        )}
      </div>

      <div className="flex min-h-[124px] flex-col gap-1 px-2">
        {leads.length === 0 ? (
          <p className="pt-6 text-center text-meta text-ink-secondary">Sin leads todavía</p>
        ) : (
          leads.map((lead) => {
            const seEstaMoviendo = leadArrastrado === lead.id;
            return (
              <button
                key={lead.id}
                type="button"
                draggable
                onDragStart={() => onDragStartLead(lead)}
                onDragEnd={onDragEndLead}
                onClick={() => onAccionesDeLead(lead)}
                title={`${nombreVisible(lead.name)} — mover o eliminar`}
                /*
                 * La ficha que se esta moviendo se VACIA, no se atenua. Atenuar
                 * con opacidad esta prohibido -deja el texto en 1.97:1- y sacarla
                 * del flujo subiria las de abajo mientras apuntas. La caja se
                 * queda exactamente donde estaba, sin contenido: que
                 * desaparezcan de golpe un nombre y un asa legibles es imposible
                 * de no ver.
                 */
                className={`flex h-7 shrink-0 cursor-grab items-center gap-1.5 rounded-md px-1.5 text-left transition-colors active:cursor-grabbing ${
                  seEstaMoviendo
                    ? 'border border-dashed border-line-strong bg-surface-sunken'
                    : 'bg-surface-sunken hover:bg-surface-hover'
                }`}
              >
                {!seEstaMoviendo && (
                  <>
                    <span aria-hidden="true" className="shrink-0">
                      {Icon.Grip()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-meta text-ink">
                      {nombreVisible(lead.name)}
                    </span>
                  </>
                )}
              </button>
            );
          })
        )}
      </div>

      {/*
        El pie: enlace de texto, no boton relleno. Un relleno hundido sobre una
        tarjeta blanca da 1.11:1, o sea que no se veria. Y sin asa: esa ausencia
        es la senal de que esto no se arrastra.
      */}
      <div className="px-2 pb-2 pt-1.5">
        {total > 0 ? (
          <button
            type="button"
            onClick={onAbrirLista}
            className="flex w-full items-center gap-1 rounded text-micro font-semibold text-primary-ink transition-colors hover:underline"
          >
            {total > FICHAS_VISIBLES ? `Ver los ${total}` : 'Ver la lista'}
            <span className="[&_svg]:h-2.5 [&_svg]:w-2.5">{Icon.ChevronRight()}</span>
          </button>
        ) : (
          /* Sin leads no hay lista que abrir, pero el hueco se reserva igual:
             si el pie desapareciera, este cuadrante mediria menos que sus
             vecinos y apuntarle al arrastrar seria distinto en cada uno. */
          <span aria-hidden="true" className="block h-4" />
        )}
      </div>
    </div>
  );
}
