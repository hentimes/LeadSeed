import type { Lead, LeadList, LeadSourceChannel, PlanesproLeadMetadata } from '../../types';
import { STATUS_COLORS, SOURCE_CHANNEL_COLORS } from '../../design/leadColors';
import { SOURCE_CHANNEL_LABELS, STATUS_LABELS } from '../../types';
import { getLeadColumnValue, LEAD_COLUMN_BY_KEY } from '../../config/leadColumns';
import CopyableValue from './CopyableValue';

interface CellContext {
  lead: Lead;
  listsMap: Map<number, LeadList>;
  compactMode: boolean;
  isSelected: boolean;
  getScore: (lead: Lead) => number;
}

/**
 * Contenido de una celda segun la columna.
 *
 * Agregar una columna nueva es: una entrada en LEAD_COLUMN_CATALOG, su
 * valor en getLeadColumnValue, y si necesita formato especial, un case
 * aca. Antes habia que duplicar markup en cuatro lugares distintos.
 */
export default function LeadCell({ columnKey, ctx }: { columnKey: string; ctx: CellContext }) {
  const definition = LEAD_COLUMN_BY_KEY.get(columnKey);
  const content = renderContent(columnKey, ctx);

  if (!definition?.copyable) return content;

  const rawValue = getLeadColumnValue(ctx.lead, columnKey, Array.from(ctx.listsMap.values()));
  return <CopyableValue value={rawValue}>{content}</CopyableValue>;
}

function renderContent(columnKey: string, ctx: CellContext) {
  const { lead, listsMap, compactMode, isSelected, getScore } = ctx;

  switch (columnKey) {
    case 'phone':
      if (!lead.phone) return <span className="text-ink-secondary">-</span>;
      return (
        <a
          href={`https://wa.me/${lead.phone.replace(/[^+\d]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="text-primary hover:text-primary-hover font-medium"
          title="Abrir WhatsApp"
        >
          {isSelected ? lead.phone : `...${lead.phone.slice(-4)}`}
        </a>
      );

    case 'email':
      if (!lead.email) return <span className="text-ink-secondary">-</span>;
      return (
        <a
          href={`mailto:${lead.email}`}
          onClick={(event) => event.stopPropagation()}
          className="text-ink-secondary hover:text-ink truncate block"
          title={lead.email}
        >
          {lead.email}
        </a>
      );

    case 'rut':
      return <span className="font-mono">{lead.rut || '-'}</span>;

    case 'lists': {
      const leadLists = (lead.listaIds || []).map((id) => listsMap.get(id)).filter(Boolean) as LeadList[];
      if (leadLists.length === 0) return <span className="text-ink-secondary">-</span>;
      return (
        <div className="flex gap-1 flex-wrap">
          {leadLists.map((list) => (
            <span
              key={list.id}
              className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium whitespace-nowrap"
              style={{ backgroundColor: `${list.color}15`, color: list.color }}
            >
              {list.name}
            </span>
          ))}
        </div>
      );
    }

    case 'status': {
      const status = lead.status || 'nuevo';
      return (
        <span
          className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium whitespace-nowrap"
          style={{ backgroundColor: `${STATUS_COLORS[status]}15`, color: STATUS_COLORS[status] }}
        >
          {STATUS_LABELS[status]}
        </span>
      );
    }

    case 'sourceChannel': {
      const metadata = (lead.metadata || {}) as PlanesproLeadMetadata;
      const channel = metadata.source_channel as LeadSourceChannel | undefined;
      if (!channel || !SOURCE_CHANNEL_LABELS[channel]) return <span className="text-ink-secondary">-</span>;
      return (
        <span
          className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium whitespace-nowrap"
          style={{ backgroundColor: `${SOURCE_CHANNEL_COLORS[channel]}15`, color: SOURCE_CHANNEL_COLORS[channel] }}
          title={metadata.capture_campaign ? `Campaña: ${metadata.capture_campaign}` : undefined}
        >
          {SOURCE_CHANNEL_LABELS[channel]}
        </span>
      );
    }

    case 'score': {
      const score = getScore(lead);
      return (
        <span className="text-[11px] font-semibold text-primary" title={`${score} de 5 datos completos`}>
          {score}/5
        </span>
      );
    }

    default: {
      const value = getLeadColumnValue(lead, columnKey, Array.from(listsMap.values()));
      if (!value) return <span className="text-ink-secondary">-</span>;
      return (
        <span className={compactMode ? 'truncate block' : 'truncate block'} title={value}>
          {value}
        </span>
      );
    }
  }
}
