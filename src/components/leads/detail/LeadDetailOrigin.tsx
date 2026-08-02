import { Badge } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { PlanesproLeadMetadata } from '../../../types';

const ORIGIN_CONFIG = {
  manual: { label: 'Manual', tone: 'neutral' as const },
  imported: { label: 'Importado', tone: 'info' as const },
  web_form: { label: 'Formulario web', tone: 'primary' as const },
};

interface Props {
  metadata: PlanesproLeadMetadata;
}

/** Origen del lead: manual, importado o formulario web, con el link/campaña si aplica. */
export default function LeadDetailOrigin({ metadata }: Props) {
  const origin = metadata.origin;
  if (!origin) return null;

  const config = ORIGIN_CONFIG[origin];
  const linkName = metadata.capture_link_name;
  const campaign = metadata.capture_campaign;

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
      <span className="text-slate-400 shrink-0">{Icon.Bullseye()}</span>
      <Badge tone={config.tone}>{config.label}</Badge>
      {origin === 'web_form' && linkName && (
        <span className="text-slate-500 font-medium truncate">
          {linkName}
          {campaign ? ` · ${campaign}` : ''}
        </span>
      )}
    </div>
  );
}
