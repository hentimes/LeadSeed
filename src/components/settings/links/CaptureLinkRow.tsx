import { useState } from 'react';
import { Badge, IconButton } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { CaptureLink } from '../../../types';
import { formatPct, funnelShares } from '../../../utils/captureLinkFormat';
import CaptureLinkMenu from './CaptureLinkMenu';

interface Props {
  link: CaptureLink;
  isOpen: boolean;
  showDefaultConcept: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onMakeDefault: () => void;
  onToggleActive: () => void;
  onResetProgress: () => void;
}

/**
 * Una linea por link: nombre, estado, embudo y las tres cifras que sirven
 * para comparar un link con otro.
 *
 * La rejilla anterior de seis metricas en linea pedia unos 418px y aqui hay
 * 272: no era una cuestion de gusto, se aplastaba, y como los scrollbars
 * estan ocultos en todo el producto nadie veia que faltaba nada. Las seis
 * siguen estando, dentro del detalle.
 */
export default function CaptureLinkRow({
  link,
  isOpen,
  showDefaultConcept,
  onToggle,
  onCopy,
  onEdit,
  onMakeDefault,
  onToggleActive,
  onResetProgress,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const shares = funnelShares(link);

  const esPrincipal = showDefaultConcept && link.isDefault;
  const puntoColor = !link.isActive
    ? 'bg-state-warning'
    : esPrincipal
      ? 'bg-primary'
      : 'bg-line-strong';

  return (
    <div className={`group relative px-2.5 py-1.5 ${link.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${puntoColor}`} aria-hidden="true" />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`link-detalle-${link.id}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus:outline-none focus-visible:underline"
        >
          <span className="truncate text-card-title font-semibold text-ink" title={link.label}>
            {link.label}
          </span>
          {esPrincipal && <Badge tone="primary">Principal</Badge>}
          {!link.isActive && <Badge tone="warning">Inactivo</Badge>}
          {!showDefaultConcept && link.isActive && (
            <Badge tone="neutral">{link.campaignName || 'Sin campaña'}</Badge>
          )}
        </button>

        {/* El ancho se reserva siempre para que el nombre no se reacomode al
            apuntar. `focus-within` es lo que las deja alcanzables con teclado. */}
        <div className="flex w-[56px] shrink-0 justify-end gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconButton
            size="sm"
            variant="ghost"
            label={`Copiar la URL de ${link.label}`}
            icon={<Icon.Copy />}
            onClick={onCopy}
          />
          <IconButton
            size="sm"
            variant="ghost"
            label={`Más acciones de ${link.label}`}
            icon={<Icon.More />}
            onClick={() => setIsMenuOpen((previo) => !previo)}
          />
        </div>

        {isMenuOpen && (
          <CaptureLinkMenu
            link={link}
            showDefaultConcept={showDefaultConcept}
            onClose={() => setIsMenuOpen(false)}
            onEdit={onEdit}
            onMakeDefault={onMakeDefault}
            onToggleActive={onToggleActive}
            onResetProgress={onResetProgress}
          />
        )}
      </div>

      {/* Embudo: leads sobre visitas, y dentro de esos, los cerrados. */}
      <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <div className="relative h-full">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${link.isActive ? 'bg-primary' : 'bg-line-strong'}`}
            style={{ width: `${shares.leads}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-state-success"
            style={{ width: `${shares.closed}%` }}
          />
        </div>
      </div>

      <p className="mt-1 truncate text-micro text-ink-muted tabular-nums">
        {link.visits} visitas · {link.totalLeads} leads ·{' '}
        <span className={link.closeRatePct > 0 ? 'text-state-success' : ''}>
          {formatPct(link.closeRatePct)} cierre
        </span>
      </p>
    </div>
  );
}
