import { GroupLabel, IconButton } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { CaptureLink, CaptureLinkStats } from '../../../types';
import { formatPct } from '../../../utils/captureLinkFormat';
import { formatearFechaHora, formatearTiempoRelativo } from '../../../utils/date';

interface Props {
  id: string;
  link: CaptureLink;
  url: string;
  stats: CaptureLinkStats[];
  /** Los tipos admin-only no traen corte por segmento. */
  showStats: boolean;
  onCopy: () => void;
}

/** Las seis del embudo, en el orden en que ocurren. */
function metricas(link: CaptureLink) {
  return [
    { label: 'Visitas', value: String(link.visits) },
    { label: 'Paso 1', value: String(link.step1Completions) },
    { label: 'Paso 2', value: String(link.step2Completions) },
    { label: 'Leads', value: String(link.totalLeads) },
    { label: 'Cierre', value: String(link.closedLeads) },
    { label: 'Ratio', value: formatPct(link.closeRatePct) },
  ];
}

/**
 * Lo que se despliega al pulsar un link: la URL, las seis metricas y los
 * segmentos que mas leads dejaron.
 *
 * El bloque de segmentos era antes una seccion hermana titulada "Analitica de
 * X" que se pintaba lejos del link al que se referia; siempre habia hablado
 * de un link concreto, asi que aqui pasa a colgar de el.
 */
export default function CaptureLinkDetail({
  id,
  link,
  url,
  stats,
  showStats,
  onCopy,
}: Props) {
  return (
    <section id={id} className="border-t border-line-soft bg-surface-sunken px-2.5 py-2">
      <div className="flex items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-micro text-ink-muted" title={url}>
          {url}
        </p>
        <IconButton
          size="sm"
          variant="ghost"
          label={`Copiar la URL de ${link.label}`}
          icon={<Icon.Copy />}
          onClick={onCopy}
        />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 panel-md:grid-cols-6">
        {metricas(link).map((metrica) => (
          <div key={metrica.label}>
            <p className="text-body font-semibold text-ink tabular-nums">{metrica.value}</p>
            <p className="text-micro text-ink-muted">{metrica.label}</p>
          </div>
        ))}
      </div>

      {/*
        Fuera de la rejilla y no como septima metrica: es `grid-cols-3` y
        `panel-md:grid-cols-6`, asi que un septimo azulejo deja un huerfano en
        las dos ramas. Aqui son 16px y cabe la hora entera, que es lo que se
        pidio, con el relativo al lado para situarla.

        Con `visits > 0` y sin fecha no se dice "sin visitas" -seria mentira,
        hay visitas contadas- sino nada: es el estado de "el rpc todavia no
        devuelve el campo".
      */}
      {link.lastVisitAt ? (
        <p className="mt-2 text-micro text-ink-muted">
          Última visita: {formatearFechaHora(link.lastVisitAt)} ·{' '}
          {formatearTiempoRelativo(link.lastVisitAt)}
        </p>
      ) : link.visits === 0 ? (
        <p className="mt-2 text-micro text-ink-muted">Sin visitas todavía.</p>
      ) : null}

      {showStats && (
        <div className="mt-3">
          <GroupLabel>Segmentos con más leads</GroupLabel>
          {stats.length === 0 ? (
            <p className="mt-1 text-micro text-ink-muted">
              Aún no hay suficientes leads para cortar por edad, renta o región.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line-soft">
              {stats.map((item) => (
                <li
                  key={`${item.captureLinkId}-${item.ageRange}-${item.incomeRange}-${item.region}-${item.healthSystem}`}
                  // La region y el sistema de salud se truncaban a media
                  // palabra en su propia linea: ahi no informaban y costaban
                  // 14px por segmento. Aqui informan y no ocupan nada.
                  title={`${item.region} · ${item.healthSystem} · ${item.healthProvider}`}
                  className="flex items-center gap-2 py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-micro text-ink-secondary">
                    {item.ageRange} · {item.incomeRange}
                  </span>
                  <span className="shrink-0 text-micro text-ink-muted tabular-nums">
                    {item.leadsCount} leads
                  </span>
                  <span className="w-10 shrink-0 text-right text-micro font-semibold text-primary tabular-nums">
                    {formatPct(item.closeRatePct)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
