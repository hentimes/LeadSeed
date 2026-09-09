import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, Hint, ListPanel, ListRow, Notice, Skeleton } from '../../design';
import { Icon } from '../../utils/icons';
import { usePlaybookRunsForLead } from '../../hooks/usePlaybookRunsForLead';
import { fetchPlaybooks } from '../../services/playbooksService';
import type { Playbook } from '../../types';

/**
 * Elegir el guion con el que conducir la reunion de un lead.
 *
 * ## Continuar, no iniciar
 *
 * Si ese lead ya esta recorriendo ese guion, el boton dice **Continuar** y no
 * abre un recorrido nuevo: un recorrido es el proceso entero y la segunda
 * reunion pertenece al mismo. Ademas del rotulo -que en un panel estrecho se
 * pasa por alto- la señal la da una insignia con el avance, que es
 * inconfundible.
 *
 * Empezar de cero solo es posible cuando el anterior se finalizo o abandono.
 */
interface Props {
  leadId: string;
  originAppointmentId?: string | null;
  onAbrirRecorrido: (runId: string) => void;
  onIrAGuiones: () => void;
}

export default function PlaybookPicker({
  leadId,
  originAppointmentId,
  onAbrirRecorrido,
  onIrAGuiones,
}: Props) {
  const runs = usePlaybookRunsForLead(leadId);
  const [guiones, setGuiones] = useState<Playbook[] | null>(null);

  useEffect(() => {
    void fetchPlaybooks(true).then(setGuiones);
  }, []);

  if (guiones === null) return <Skeleton height="40px" />;

  if (guiones.length === 0) {
    return (
      <EmptyState
        icon={Icon.Bullseye()}
        title="No hay guiones activos"
        description="Crea uno para poder conducir la reunión con él."
        action={
          <Button variant="primary" size="sm" onClick={onIrAGuiones}>
            Ir a Playbooks
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {!!runs.error && <Notice tone="warning">{runs.error}</Notice>}

      <ListPanel>
        {guiones.map((guion) => {
          const enCurso = runs.enCursoDe(guion.id);

          return (
            <ListRow key={guion.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-ink">{guion.name}</p>
                {enCurso && (
                  <Badge tone="warning" className="mt-1">
                    En curso desde {new Date(enCurso.startedAt).toLocaleDateString('es-CL')}
                  </Badge>
                )}
              </div>

              <Button
                variant={enCurso ? 'secondary' : 'primary'}
                size="sm"
                disabled={runs.iniciando}
                onClick={async () => {
                  if (enCurso) {
                    onAbrirRecorrido(enCurso.id);
                    return;
                  }
                  const runId = await runs.iniciar(guion.id, originAppointmentId);
                  if (runId) onAbrirRecorrido(runId);
                }}
              >
                {enCurso ? 'Continuar' : 'Iniciar'}
              </Button>
            </ListRow>
          );
        })}
      </ListPanel>

      {runs.historicos.length > 0 && (
        <Hint>
          {`Este lead tiene ${runs.historicos.length} ${runs.historicos.length === 1 ? 'recorrido cerrado' : 'recorridos cerrados'}.`}
        </Hint>
      )}
    </div>
  );
}
