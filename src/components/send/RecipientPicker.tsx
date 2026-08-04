import { useMemo } from 'react';
import type { Lead, LeadList } from '../../types';
import { Badge, Button, EmptyState, Input } from '../../design';
import { Icon } from '../../utils/icons';

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

  return (
    <div className="flex flex-col gap-2.5">
      {/* Listas */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-micro font-medium text-ink-secondary">Tus listas</span>
          {hasSelection && (
            <button
              onClick={onClear}
              className="text-micro font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              Limpiar
            </button>
          )}
        </div>

        {leadLists.length === 0 ? (
          <p className="text-micro text-ink-muted">Todavía no creaste listas.</p>
        ) : (
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
        )}
      </div>

      {/* Leads sueltos */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-micro font-medium text-ink-secondary">Leads directos</span>
          <span className="text-micro tabular-nums text-ink-muted">{filteredLeads.length}</span>
        </div>

        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="mb-1.5"
        />

        <div className="max-h-52 overflow-y-auto rounded-md border border-line bg-surface">
          {filteredLeads.length === 0 ? (
            <EmptyState
              icon={<Icon.Search />}
              title="Sin resultados"
              description={search ? 'Probá con otro nombre o número.' : 'No hay leads en esta selección.'}
            />
          ) : (
            filteredLeads.map((lead) => {
              const checked = selectedLeadIds.has(lead.id!);
              const secondary = secondaryField === 'email' ? lead.email : lead.phone;
              return (
                <label
                  key={lead.id}
                  className={`flex cursor-pointer items-center gap-2 border-b border-line px-2 py-1.5 transition-colors last:border-0 hover:bg-surface-hover ${
                    checked ? 'bg-primary-soft' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLead(lead.id!)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">{lead.name}</span>
                    <span className="block truncate text-micro text-ink-muted">
                      {secondary || (secondaryField === 'email' ? 'Sin correo' : 'Sin teléfono')}
                    </span>
                  </span>
                  {sentLeadIds.has(lead.id!) && (
                    <Badge tone="success" className="shrink-0">
                      Enviado
                    </Badge>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>
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
