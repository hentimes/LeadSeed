import { Badge, Button, EmptyState, ListPanel, ListRow } from '../../design';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';
import type { PlaybookRun } from '../../types';

const ROTULO_ESTADO: Record<PlaybookRun['status'], string> = {
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  abandonado: 'Abandonado',
};

/** Los recorridos: los que siguen abiertos primero, el historial debajo. */
interface Props {
  enCurso: PlaybookRun[];
  historicos: PlaybookRun[];
  onAbrir: (run: PlaybookRun) => void;
  onCrearGuion: () => void;
}

function Fila({ run, onAbrir }: { run: PlaybookRun; onAbrir: (run: PlaybookRun) => void }) {
  return (
    <ListRow>
      <button type="button" onClick={() => onAbrir(run)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-body font-medium text-ink">{run.leadName ?? 'Lead'}</p>
        <p className="truncate text-micro text-ink-muted">
          {run.playbookName ?? 'Guion'} · {formatearFecha(run.startedAt)}
        </p>
      </button>
      <Badge tone={run.status === 'en_curso' ? 'warning' : 'neutral'}>
        {ROTULO_ESTADO[run.status]}
      </Badge>
    </ListRow>
  );
}

export default function PlaybookRunList({ enCurso, historicos, onAbrir, onCrearGuion }: Props) {
  if (enCurso.length === 0 && historicos.length === 0) {
    return (
      <EmptyState
        icon={Icon.Bullseye()}
        title="Ningún recorrido todavía"
        description="Los recorridos empiezan desde la ficha de un lead, al conducir una reunión con un guion."
        action={
          <Button variant="secondary" size="sm" onClick={onCrearGuion}>
            Ver los guiones
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {enCurso.length > 0 && (
        <ListPanel>
          {enCurso.map((run) => (
            <Fila key={run.id} run={run} onAbrir={onAbrir} />
          ))}
        </ListPanel>
      )}

      {historicos.length > 0 && (
        <div>
          <p className="mb-1 text-micro font-bold uppercase tracking-widest text-ink-muted">
            Cerrados
          </p>
          <ListPanel>
            {historicos.map((run) => (
              <Fila key={run.id} run={run} onAbrir={onAbrir} />
            ))}
          </ListPanel>
        </div>
      )}
    </div>
  );
}
