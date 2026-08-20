import { Button, Card, EmptyState, IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import type { FlowChannel, PendingFlowStep } from '../../types';

/**
 * Cuantos dias de atraso lleva un paso. Negativo o cero = todavia no vencio.
 */
function diasDeAtraso(dueAt: string | undefined, ahora: Date): number {
  if (!dueAt) return 0;
  const ms = ahora.getTime() - new Date(dueAt).getTime();
  return Math.floor(ms / 86400000);
}

/**
 * El verbo del boton depende del canal, y no es cosmetico.
 *
 * WhatsApp **abre** un chat: la aplicacion no sabe si el mensaje sale. El
 * correo **se envia** de verdad. La llamada solo se registra, porque marcarla
 * es lo unico que la aplicacion puede hacer.
 */
const ACCION: Record<FlowChannel, string> = {
  whatsapp: 'Abrir WhatsApp',
  email: 'Enviar correo',
  call: 'Marcar llamada',
};

interface Props {
  cola: PendingFlowStep[];
  ahora: Date;
  onDespachar: (fila: PendingFlowStep) => void;
  onOmitir: (fila: PendingFlowStep) => void;
  onIrAFlujos: () => void;
}

export function FlowTodayList({ cola, ahora, onDespachar, onOmitir, onIrAFlujos }: Props) {
  if (cola.length === 0) {
    return (
      <EmptyState
        title="Nada pendiente por ahora"
        description="Los proximos pasos apareceran aqui el dia que les toque."
        action={<Button onClick={onIrAFlujos}>Ver mis flujos</Button>}
      />
    );
  }

  const atrasados = cola.filter((f) => diasDeAtraso(f.dueAt, ahora) > 0);
  const deHoy = cola.filter((f) => diasDeAtraso(f.dueAt, ahora) <= 0);

  const seccion = (titulo: string, filas: PendingFlowStep[]) =>
    filas.length === 0 ? null : (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
          {titulo} · {filas.length}
        </span>
        <Card padding="none">
          <ul className="min-w-0">
            {filas.map((fila) => {
              const atraso = diasDeAtraso(fila.dueAt, ahora);
              return (
                <li
                  key={fila.progressId}
                  className="flex min-w-0 items-start gap-2 border-b border-line-soft px-3 py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
                        {nombreVisible(fila.leadName)}
                      </span>
                      <span
                        className={`shrink-0 text-micro font-medium ${
                          atraso > 0 ? 'text-state-warning' : 'text-ink-muted'
                        }`}
                      >
                        {atraso > 0 ? `Atrasado ${atraso}d` : 'Toca hoy'}
                      </span>
                    </div>
                    <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                      {fila.flowName} · paso {fila.stepOrder} · {fila.templateName}
                    </span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Button size="sm" variant="primary" onClick={() => onDespachar(fila)}>
                        {ACCION[fila.channel]}
                      </Button>
                      <IconButton
                        icon={<Icon.Close />}
                        label={`Omitir este paso para ${fila.leadName}`}
                        size="sm"
                        onClick={() => onOmitir(fila)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {seccion('Atrasados', atrasados)}
      {seccion('Para hoy', deHoy)}
    </div>
  );
}
