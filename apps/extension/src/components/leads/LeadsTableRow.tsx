import { memo, useState, useMemo } from 'react';
import type { Lead, LeadList } from '../../types';
import type { LeadPendingFlags } from '../../services/leadPendingService';
import type { ColumnDef } from '../../types';
import { Icon } from '../../utils/icons';
import { tonoDeFila, type ListDensity } from '../../design';
import LeadCell from './LeadCell';
import LeadIdentity from './LeadIdentity';
import { nombreCorto } from '../../utils/leadDisplay';

interface Props {
  lead: Lead;
  idx: number;
  selectedIds: Set<string>;
  sendCounts: Record<string, { whatsapp: number; email: number }>;
  /** Que tiene pendiente cada lead: cita por delante, tarea sin cerrar, o las dos. */
  pendingFlags: Record<string, LeadPendingFlags>;
  /** Lleva a la cita o a la tarea concreta del distintivo. */
  onOpenPending: (destino: { citaId?: string; tareaId?: string }) => void;
  listsMap: Map<number, LeadList>;
  compactMode: boolean;
  filterMode?: string | null;
  isTrash?: boolean;

  /** Columnas efectivamente renderizadas, ya filtradas por ancho. */
  columns: ColumnDef[];

  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onTogglePin: (lead: Lead, isPinned: boolean) => void;
  getScore: (lead: Lead) => number;

  /** Reordenamiento de leads fijados por arrastre. */
  onPinDrop?: (sourceId: string, targetId: string) => void;
}

const getPurpleShade = (id: string) => {
  const shades = [
    'bg-primary-soft text-primary',
    'bg-primary-soft-strong text-primary-hover',
    'bg-primary-soft-strong text-primary-deep',
    'bg-primary-light text-white',
    'bg-primary text-white',
    'bg-primary-deep text-white',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return shades[Math.abs(hash) % shades.length];
};

const AvatarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LeadsTableRow = ({
  lead, idx, selectedIds, sendCounts, pendingFlags, onOpenPending, listsMap, compactMode, filterMode, isTrash, columns,
  onView, onEdit, onDelete, onRestore, onTogglePin, getScore,
  onPinDrop,
}: Props) => {
  const isSelected = selectedIds.has(lead.id!);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  // Se toma una vez por fila: antes se indexaba el registro seis veces, y la
  // comprobacion usaba `?.` pero la lectura de al lado no.
  const enviosDelLead = sendCounts[lead.id!];
  const pendientesDelLead = pendingFlags[lead.id!];

  /*
   * El relleno de la celda y el tono de la fila salen de `design/ListPanel`,
   * que es de donde salen tambien en el pipeline, en el modal de flujos y en el
   * selector de destinatarios. Estaban escritos a mano aqui, y por eso esta
   * tabla tenia un relleno distinto de las otras cuatro listas.
   *
   * El tono va en el `<tr>` y el relleno en cada `<td>`, que es como funciona
   * una tabla: un `<tr>` no admite relleno propio de forma fiable.
   *
   * Un lead sin abrir se tine hasta que se ve su detalle. No depende del badge
   * de la extension, que se limpia con solo abrirla: son cosas distintas.
   */
  /*
   * El alto de fila ya no depende de `compactMode`: es el mismo `px-3 py-2` de
   * todas las demas listas. Se pidio expresamente que la separacion entre dos
   * leads fuera identica a la de la lista de flujos, y con `compactMode`
   * -que viene activado por defecto- esta tabla era la unica a `py-1.5`.
   *
   * `compactMode` sigue haciendo lo demas: abreviar el nombre y sacar el RUT
   * bajo el, que es donde de verdad ahorra espacio en un panel angosto.
   */
  const densidad: ListDensity = 'normal';
  const cellPad = 'px-3 py-2';

  const trClass = `border-b border-line transition-colors cursor-pointer ${
    tonoDeFila({ isSelected, isUnread: lead.isUnread })
  } ${!isSelected && !lead.isUnread ? 'bg-surface' : ''} ${
    lead.isPinned ? 'cursor-grab active:cursor-grabbing active:opacity-50' : ''
  }`;

  // El RUT se muestra bajo el nombre solo si su columna no esta a la vista,
  // asi no se pierde el dato al angostar el panel ni se duplica al abrirlo.
  const rutColumnVisible = columns.some((column) => column.key === 'rut');
  const showRutUnderName = compactMode && !rutColumnVisible && !!lead.rut;

  const checkboxBox = (
    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-line bg-surface'}`}>
      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={isSelected ? 1 : 0} />
      </svg>
    </div>
  );

  /*
   * Los distintivos se memoizan con las mismas dependencias que usa el
   * comparador de `memo` al final del archivo. No es adorno: `LeadIdentity`
   * los recibe como un nodo, y un nodo nuevo en cada render del padre romperia
   * la memoizacion de la fila en silencio. En una tabla de mil leads eso no se
   * nota como un fallo, se nota como lentitud sin causa aparente.
   */
  const badges = useMemo(
    () => (
      <>
        {/*
          Cita y tarea pendientes, en ese orden.
 
          Van los primeros de la tira porque responden a "que tengo que hacer
          con este lead", que es la pregunta con la que se recorre la lista.
          Sin fondo ni contador: son un si o un no, y una pastilla con numero
          al lado de los contadores de envio se leeria como un tercer contador.
        */}
        {pendientesDelLead?.citaId && (
          <button
            type="button"
            onClick={(event) => {
              // La fila entera abre el lead: sin esto, el clic haria las dos
              // cosas y ganaria la que se resolviera despues.
              event.stopPropagation();
              onOpenPending({ citaId: pendientesDelLead.citaId });
            }}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
            title="Ver la cita agendada"
            aria-label={`Ver la cita agendada de ${lead.name}`}
          >
            {Icon.Calendar()}
          </button>
        )}
        {pendientesDelLead?.tareaId && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPending({ tareaId: pendientesDelLead.tareaId });
            }}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
            title="Ver la tarea pendiente"
            aria-label={`Ver la tarea pendiente de ${lead.name}`}
          >
            {Icon.Tasks()}
          </button>
        )}
        {lead.hasUnreadCrossExecAlert && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-state-warning-soft text-state-warning whitespace-nowrap">
            {Icon.Warning()} Cruce
          </span>
        )}
        {(enviosDelLead?.whatsapp ?? 0) > 0 && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onView(lead);
            }}
            className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-ink-inverse bg-state-success rounded-full cursor-pointer hover:bg-state-success/80 shadow-sm"
            // "Abiertos", no "enviados": WhatsApp se abre en otra pestaña y la
            // aplicacion no sabe si el mensaje llego a salir. El verde se queda
            // porque es el color de marca del canal, no una afirmacion de exito.
            title={`${enviosDelLead?.whatsapp} chat(s) de WhatsApp abierto(s)`}
          >
            {enviosDelLead?.whatsapp}
          </span>
        )}
        {(enviosDelLead?.email ?? 0) > 0 && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onView(lead);
            }}
            className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-ink-inverse bg-state-info rounded-full cursor-pointer hover:bg-state-info/80 shadow-sm"
            // Aqui "enviado" si es cierto: el correo sale de verdad por la API.
            title={`${enviosDelLead?.email} correo(s) enviado(s)`}
          >
            {enviosDelLead?.email}
          </span>
        )}
        {filterMode === 'olvidados' && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-state-danger-soft text-state-danger whitespace-nowrap">
            {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24))} días olv.
          </span>
        )}
      </>
    ),
    [lead, enviosDelLead, pendientesDelLead, filterMode, onView, onOpenPending]
  );

  const avatar = (
    <div
      className={`w-7 h-7 rounded-[4px] shrink-0 flex items-center justify-center shadow-sm relative ${getPurpleShade(lead.id!)}`}
      onMouseEnter={() => setIsHoveringAvatar(true)}
      onMouseLeave={() => setIsHoveringAvatar(false)}
    >
      <div className={`transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-0' : 'opacity-100'}`}>
        <AvatarIcon />
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin(lead, !lead.isPinned);
        }}
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}
        title={lead.isPinned ? 'Quitar pin' : 'Fijar lead al inicio'}
      >
        <div className="w-3.5 h-3.5">{Icon.pin()}</div>
      </button>
    </div>
  );

  const nameCell = (
    <LeadIdentity
      density={densidad}
      name={compactMode ? nombreCorto(lead.name) : lead.name}
      avatar={avatar}
      badges={badges}
      caption={showRutUnderName ? <span className="font-mono">RUT: {lead.rut}</span> : undefined}
    />
  );

  const actions = (
    <div className="flex gap-1.5 justify-end items-center pr-1 min-w-[64px]">
      <button onClick={(event) => { event.stopPropagation(); onView(lead); }} title="Ver" aria-label={`Ver ${lead.name}`} className="text-ink-secondary hover:text-ink text-xs p-1">{Icon.View()}</button>
      {isTrash ? (
        <>
          {onRestore && <button onClick={(event) => { event.stopPropagation(); onRestore(lead.id!); }} title="Restaurar" aria-label={`Restaurar ${lead.name}`} className="text-ink-secondary hover:text-green-600 text-xs p-1">{Icon.Restore()}</button>}
          {isSelected && <button onClick={(event) => { event.stopPropagation(); onDelete(lead.id!); }} title="Eliminar definitivo" aria-label={`Eliminar definitivamente ${lead.name}`} className="text-ink-secondary hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      ) : (
        <>
          <button onClick={(event) => { event.stopPropagation(); onEdit(lead); }} title="Editar" aria-label={`Editar ${lead.name}`} className="text-ink-secondary hover:text-ink text-xs p-1">{Icon.Edit()}</button>
          {isSelected && <button onClick={(event) => { event.stopPropagation(); onDelete(lead.id!); }} title="Eliminar" aria-label={`Eliminar ${lead.name}`} className="text-ink-secondary hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      )}
    </div>
  );

  // Solo los leads fijados se pueden reordenar entre si.
  const pinDragProps = lead.isPinned && onPinDrop
    ? {
        draggable: true,
        onDragStart: (event: React.DragEvent) => {
          // setData es obligatorio: sin el, Chrome no completa el drop.
          // No se toca estado: mutar el elemento arrastrado aborta el drag.
          event.dataTransfer.setData('text/plain', lead.id!);
          event.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (event: React.DragEvent) => {
          // Solo preventDefault: cualquier setState aca dispara un re-render
          // por cada evento de dragover y Chrome cancela el arrastre.
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          onPinDrop?.(event.dataTransfer.getData('text/plain'), lead.id!);
        },
      }
    : {};

  return (
    <tr data-row-index={idx} data-lead-id={lead.id!} className={trClass} {...pinDragProps}>
      <td className={cellPad}>{checkboxBox}</td>

      {columns.map((column) => (
        <td key={column.key} className={`${cellPad} align-middle text-[12px] overflow-hidden`}>
          {column.key === 'name' ? nameCell : (
            <LeadCell columnKey={column.key} ctx={{ lead, listsMap, compactMode, isSelected, getScore }} />
          )}
        </td>
      ))}

      <td className={`${cellPad} w-[92px] sticky right-0 bg-inherit shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10`}>
        {actions}
      </td>
    </tr>
  );
};

export default memo(LeadsTableRow, (prev, next) => {
  if (prev.lead !== next.lead) return false;
  if (prev.idx !== next.idx) return false;

  if (prev.selectedIds.has(prev.lead.id!) !== next.selectedIds.has(next.lead.id!)) return false;

  if (prev.compactMode !== next.compactMode) return false;
  if (prev.filterMode !== next.filterMode) return false;
  if (prev.isTrash !== next.isTrash) return false;

  // Basta comparar la identidad del arreglo: LeadsTable lo memoiza.
  if (prev.columns !== next.columns) return false;

  if (prev.sendCounts !== next.sendCounts) return false;
  if (prev.pendingFlags !== next.pendingFlags) return false;
  if (prev.onOpenPending !== next.onOpenPending) return false;
  if (prev.listsMap !== next.listsMap) return false;

  return true;
});
