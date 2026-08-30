import { useState } from 'react';
import { Button, Input, ListPagination, ListRow, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import LeadIdentity from '../leads/LeadIdentity';
import SinNombreToggle from '../leads/SinNombreToggle';
import { nombreVisible, telefonoEnmascarado } from '../../utils/leadDisplay';
import { STATUS_COLORS, STATUS_LABELS, type Lead, type LeadStatus } from '../../types';

/** Cuantos leads por pagina dentro de la hoja. */
const LEADS_POR_PAGINA = 8;

/**
 * LOS LEADS DE UNA ETAPA
 *
 * ## Por que en una hoja
 *
 * La lista vivia incrustada en la pagina, entre la barra de busqueda y los
 * cuadrantes. Encajada ahi hacia dos cosas malas a la vez: empujaba los
 * cuadrantes hacia abajo -que son el mapa de la pantalla- y se leia como una
 * capa de otro material metida entre dos bloques que no le correspondian.
 *
 * Ademas duplicaba: los cuadrantes ya asoman los primeros nombres de cada
 * etapa, asi que el estado activo se dibujaba dos veces en la misma pantalla.
 *
 * En una hoja la pagina queda con lo que la explica -buscador y cuadrantes- y
 * la lista aparece cuando la pedis. Es el mismo gesto que los destinatarios en
 * Mensajes, asi que no estrena patron.
 *
 * ## Pagina, no scroll
 *
 * Los scrollbars estan ocultos en todo el producto, asi que una lista con
 * scroll no anuncia que hay mas abajo. La version anterior tenia `max-h-250px`
 * con scroll invisible: con 561 leads mostraba cinco y no habia forma de saber
 * que faltaban 556.
 *
 * ## Buscar dentro de la etapa
 *
 * El buscador de la pagina filtra las cinco etapas a la vez -por eso vive
 * afuera-. Este acota dentro de la que estas mirando, que es otra pregunta.
 */
export function StageLeadsSheet({
  estado,
  leads,
  onAbrirLead,
  onAcciones,
  onClose,
  ocultarSinNombre,
  onToggleSinNombre,
  sinNombreTotal,
}: {
  estado: LeadStatus;
  leads: Lead[];
  onAbrirLead: (lead: Lead) => void;
  onAcciones: (lead: Lead) => void;
  onClose: () => void;
  /**
   * El interruptor de "sin nombre" vive ADENTRO de la hoja. Es una preferencia
   * de la cuenta compartida con la tabla de leads, asi que el estado es uno
   * solo; lo que cambia es donde se alcanza. La hoja tapa la barra de la
   * pagina, asi que los dos nunca se ven a la vez.
   */
  ocultarSinNombre: boolean;
  onToggleSinNombre: () => void;
  sinNombreTotal: number;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const filtrados = busqueda.trim()
    ? leads.filter((lead) => {
        const texto = busqueda.toLowerCase().trim();
        return (
          lead.name.toLowerCase().includes(texto) ||
          (lead.company || '').toLowerCase().includes(texto) ||
          (lead.phone || '').includes(texto)
        );
      })
    : leads;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / LEADS_POR_PAGINA));

  /*
   * Al filtrar, la pagina 7 puede dejar de existir. Se ajusta durante el render
   * y no desde un efecto: corregirlo en un efecto pinta primero la pagina vieja
   * con el filtro nuevo y despues rectifica, que es un render en cascada
   * visible.
   */
  const [filtroAnterior, setFiltroAnterior] = useState(busqueda);
  if (filtroAnterior !== busqueda) {
    setFiltroAnterior(busqueda);
    setPagina(1);
  }

  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * LEADS_POR_PAGINA, paginaActual * LEADS_POR_PAGINA);

  return (
    <Modal onClose={onClose} maxWidth="400px" label={`Leads en ${STATUS_LABELS[estado]}`} align="top">
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span
            aria-hidden="true"
            className="h-4 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[estado] }}
          />
          <h2 className="min-w-0 flex-1 truncate text-section-title font-semibold text-ink">
            {STATUS_LABELS[estado]}
          </h2>
          <span className="shrink-0 text-meta tabular-nums text-ink-secondary">
            {busqueda.trim() ? `${filtrados.length} de ${leads.length}` : `${leads.length}`}
          </span>
        </div>

        {leads.length > 0 && (
          <div className="flex items-center gap-2 px-4 pt-3">
            <Input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={`Buscar en ${STATUS_LABELS[estado]}...`}
              aria-label={`Buscar dentro de ${STATUS_LABELS[estado]}`}
              className="flex-1"
            />
            <SinNombreToggle
              count={sinNombreTotal}
              ocultos={ocultarSinNombre}
              onToggle={onToggleSinNombre}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {visibles.length === 0 ? (
            <p className="py-6 text-center text-meta text-ink-secondary">
              {busqueda.trim()
                ? 'Ningún lead coincide con la búsqueda.'
                : `Todavía no hay leads en ${STATUS_LABELS[estado]}.`}
            </p>
          ) : (
            /*
              Sin `draggable`: aca era letra muerta. El destino del arrastre son
              los cuadrantes, y esta hoja los tapa, asi que origen y destino
              nunca estaban en pantalla a la vez. Prometer un gesto imposible es
              peor que no tenerlo. Desde aca se mueve con el boton de acciones.
            */
            <div className="overflow-hidden rounded-md border border-line">
              {visibles.map((lead) => (
                <ListRow
                  key={lead.id}
                  onClick={() => onAbrirLead(lead)}
                  className="cursor-pointer border-b border-line-soft last:border-b-0"
                >
                  <LeadIdentity
                    className="min-w-0 flex-1"
                    name={lead.name}
                    caption={[lead.company, lead.phone && telefonoEnmascarado(lead.phone)]
                      .filter(Boolean)
                      .join(' · ')}
                  />

                  {/*
                    Siempre visible y a contraste pleno. El acceso a las
                    acciones era un ojo de 24px dentro de un bloque a
                    `opacity-50` -1.97:1- que solo aparecia al pasar el raton:
                    en tactil no existia.
                  */}
                  <button
                    type="button"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      onAcciones(lead);
                    }}
                    title={`Acciones para ${nombreVisible(lead.name)}`}
                    aria-label={`Acciones para ${nombreVisible(lead.name)}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-4 [&_svg]:w-4"
                  >
                    {Icon.More()}
                  </button>
                </ListRow>
              ))}
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="mt-2">
              <ListPagination page={paginaActual} pageCount={totalPaginas} onPageChange={setPagina} />
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2.5">
          <Button variant="primary" onClick={onClose} className="h-control-lg w-full font-semibold">
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
