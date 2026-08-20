import { useMemo, useState } from 'react';
import type { Lead, LeadList } from '../../types';
import { Badge, Button, EmptyState, Input, ListPagination, ListPanel, ListRow } from '../../design';
import { Icon } from '../../utils/icons';
import LeadIdentity from '../leads/LeadIdentity';

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
  sentLeadIds,
  /** Dato bajo el nombre: telefono en WhatsApp, correo en email. */
  secondaryField = 'phone',
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
  sentLeadIds: Set<string>;
  secondaryField?: 'phone' | 'email';
}) {
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedListIds.size > 0) {
      result = result.filter((lead) => lead.listaIds.some((id) => selectedListIds.has(id)));
    }
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (lead) => lead.name.toLowerCase().includes(query) || (lead.phone || '').includes(query),
      );
    }
    return result;
  }, [leads, selectedListIds, search]);

  const hasSelection = selectedLeadIds.size > 0 || selectedListIds.size > 0;

  /*
   * Paginacion. Antes se pintaban los mil leads de golpe dentro de un alto fijo
   * de `max-h-52`: el navegador montaba mil filas para ensenar cuatro, y para
   * llegar al lead 900 habia que arrastrar la barra a ciegas.
   */
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(filteredLeads.length / LEADS_POR_PAGINA));

  /*
   * Al cambiar el filtro, la pagina 7 puede dejar de existir, asi que se vuelve
   * a la primera. Se hace ajustando el estado durante el render y no desde un
   * `useEffect`: reiniciarlo en un efecto pinta primero la pagina vieja con el
   * filtro nuevo y despues corrige, que es un render en cascada visible. Es el
   * patron que React documenta para estado derivado de props.
   */
  const filtroActual = `${search}|${[...selectedListIds].sort().join(',')}`;
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
      <Input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar por nombre o teléfono..."
      />

      {/*
        `flush` y los margenes negativos sacan la lista del relleno de la
        tarjeta del paso: se apoya en el borde en vez de dibujar una segunda
        caja dentro de la primera. Es el aspecto de la lista de inscripcion a
        flujos, que es la referencia que adopto el producto.
      */}
      {/*
        Sin rotulo ni cuenta: "Leads directos" repetia lo que el paso ya dice y
        gastaba una franja entera. La cuenta de seleccionados ya vive en la
        cabecera del paso.
      */}
      <ListPanel
        flush
        className="-mx-3"
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
          const secondary = secondaryField === 'email' ? lead.email : lead.phone;
          return (
            <ListRow as="label" key={lead.id} isSelected={checked} className="cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleLead(lead.id!)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
              />
              <LeadIdentity
                className="flex-1"
                name={lead.name}
                caption={secondary || (secondaryField === 'email' ? 'Sin correo' : 'Sin teléfono')}
              />
              {sentLeadIds.has(lead.id!) && (
                <Badge tone="success" className="shrink-0">Enviado</Badge>
              )}
            </ListRow>
          );
        })}
      </ListPanel>

      {/* Filtro por lista, debajo de lo que filtra. */}
      {leadLists.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-micro font-medium text-ink-secondary">Filtrar por lista</span>
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
              const count = leads.filter((lead) => lead.listaIds.includes(list.id!)).length;
              return (
                <button
                  key={list.id}
                  onClick={() => onToggleList(list.id!)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-micro font-medium transition-colors ${
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
                  <span className={`tabular-nums ${on ? 'opacity-75' : 'text-ink-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Resumen de la seleccion, para el encabezado del paso. */
export function RecipientCount({ count }: { count: number }) {
  return (
    <Badge tone={count > 0 ? 'primary' : 'neutral'}>
      {count} {count === 1 ? 'destinatario' : 'destinatarios'}
    </Badge>
  );
}

/** Boton de accion primaria del envio, identico en los tres canales. */
export function SendAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="primary" onClick={onClick} disabled={disabled} className="w-full">
      {label}
    </Button>
  );
}
