import { useEffect, useState } from 'react';
import { Button, Card, IconButton, Select } from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import { FlowProgressRail, MAX_PASOS_RIEL } from './FlowProgressRail';
import { fetchEnrollments, fetchProgress } from '../../services/messageFlowsService';
import { estadosDePasos } from '../../services/flowProgress';
import type {
  ExitReason,
  MessageFlow,
  MessageFlowEnrollment,
  MessageFlowProgress,
  MessageFlowStep,
} from '../../types';

/**
 * Motivos de salida que el usuario puede elegir.
 *
 * `fin_secuencia` y `otro_flujo` no estan: el primero lo pone la base cuando se
 * registra el ultimo paso, el segundo lo pone reinscribir en otro flujo del
 * mismo canal. Ofrecerlos a mano seria dejar que alguien afirme algo que en
 * realidad decidio el sistema.
 */
const MOTIVOS_SALIDA: Array<{ valor: ExitReason; label: string }> = [
  { valor: 'convertido', label: 'Se convirtio' },
  { valor: 'descartado', label: 'Se descarto' },
  { valor: 'respondio', label: 'Respondio' },
  { valor: 'manual', label: 'Otro motivo' },
];

const ETIQUETA_SALIDA: Record<ExitReason, string> = {
  convertido: 'Convertido',
  descartado: 'Descartado',
  fin_secuencia: 'Termino la secuencia',
  respondio: 'Respondio',
  manual: 'Retirado a mano',
  otro_flujo: 'Paso a otro flujo',
};

interface Props {
  flujo: MessageFlow;
  pasos: MessageFlowStep[];
  onVolver: () => void;
  onEditar: () => void;
  onInscribir: () => void;
  onPausar: (activo: boolean) => Promise<void>;
  onSacar: (enrollmentId: number, motivo: ExitReason) => Promise<void>;
  refreshKey: number;
}

export function FlowDetail({
  flujo,
  pasos,
  onVolver,
  onEditar,
  onInscribir,
  onPausar,
  onSacar,
  refreshKey,
}: Props) {
  const [inscritos, setInscritos] = useState<MessageFlowEnrollment[]>([]);
  const [progreso, setProgreso] = useState<MessageFlowProgress[]>([]);
  const [sacando, setSacando] = useState<number | null>(null);
  const [motivoSalida, setMotivoSalida] = useState<ExitReason>('manual');

  useEffect(() => {
    let cancelado = false;
    fetchEnrollments(flujo.id).then(async (lista) => {
      if (cancelado) return;
      setInscritos(lista);
      setProgreso(await fetchProgress(lista.map((e) => e.id)));
    });
    return () => { cancelado = true; };
  }, [flujo.id, refreshKey]);

  const activos = inscritos.filter((e) => e.status === 'activa');
  const cerrados = inscritos.filter((e) => e.status !== 'activa');
  const esCorreo = flujo.channel === 'email';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconButton icon={<Icon.ArrowLeft />} label="Volver" size="sm" onClick={onVolver} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-card-title font-semibold text-ink">{flujo.name}</h2>
          <p className="text-micro text-ink-secondary">
            {pasos.length} paso{pasos.length === 1 ? '' : 's'} · {activos.length} activo
            {activos.length === 1 ? '' : 's'}
            {!flujo.isActive && ' · pausado'}
          </p>
        </div>
        <IconButton icon={<Icon.Edit />} label="Editar el flujo" size="sm" onClick={onEditar} />
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onInscribir} disabled={!flujo.isActive}>
          Inscribir
        </Button>
        <Button size="sm" onClick={() => onPausar(!flujo.isActive)}>
          {flujo.isActive ? 'Pausar' : 'Reanudar'}
        </Button>
      </div>

      {!flujo.isActive && (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-micro text-ink-secondary">
          Pausado: no se puede inscribir a nadie nuevo. Los que ya estan dentro conservan su progreso.
        </p>
      )}

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">Pasos</span>
        <Card padding="none">
          <ul className="min-w-0">
            {pasos.map((paso) => (
              <li
                key={paso.id}
                className="flex min-w-0 items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-bold text-primary">
                  {paso.stepOrder}
                </span>
                <span className="min-w-0 flex-1 truncate text-micro text-ink-secondary">
                  {paso.waitDays === 0
                    ? 'Al inscribir'
                    : `${paso.waitDays} dia${paso.waitDays === 1 ? '' : 's'} despues del anterior`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
          Inscritos · {activos.length}
        </span>

        {activos.length === 0 ? (
          <p className="text-micro text-ink-muted">
            Nadie inscrito todavia. Al inscribir un lead se le programa el primer paso.
          </p>
        ) : (
          <Card padding="none">
            <ul className="min-w-0">
              {activos.map((inscrito) => {
                const suyo = progreso.filter((p) => p.enrollmentId === inscrito.id);
                const estados = estadosDePasos(pasos, suyo);
                const hechos = estados.filter((e) => e !== 'pendiente' && e !== 'toca').length;

                return (
                  <li
                    key={inscrito.id}
                    className="flex min-w-0 flex-col gap-1.5 border-b border-line-soft px-3 py-2.5 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
                        {nombreVisible(inscrito.leadName)}
                      </span>
                      <IconButton
                        icon={<Icon.Close />}
                        label={`Sacar a ${nombreVisible(inscrito.leadName)} del flujo`}
                        size="sm"
                        onClick={() => setSacando(inscrito.id)}
                      />
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      {/* Por encima de doce pasos el riel deja de leerse y se
                          cambia por el conteo, que informa lo mismo peor pero
                          sin mentir. */}
                      {pasos.length <= MAX_PASOS_RIEL && (
                        <FlowProgressRail estados={estados} esCorreo={esCorreo} />
                      )}
                      <span className="text-micro text-ink-secondary">
                        {hechos} de {pasos.length}
                      </span>
                    </div>

                    {sacando === inscrito.id && (
                      <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-sunken p-2.5">
                        <label className="text-micro text-ink-secondary" htmlFor={`motivo-${inscrito.id}`}>
                          ¿Por que sale del flujo?
                        </label>
                        <Select
                          id={`motivo-${inscrito.id}`}
                          value={motivoSalida}
                          onChange={(e) => setMotivoSalida(e.target.value as ExitReason)}
                        >
                          {MOTIVOS_SALIDA.map((m) => (
                            <option key={m.valor} value={m.valor}>{m.label}</option>
                          ))}
                        </Select>
                        <p className="text-micro text-ink-muted">
                          Los pasos que faltan se cancelan. Lo ya registrado se conserva.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => setSacando(null)}>Cancelar</Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              await onSacar(inscrito.id, motivoSalida);
                              setSacando(null);
                            }}
                          >
                            Sacar
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {cerrados.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-micro font-bold uppercase tracking-wider text-ink-muted">
            Ya no estan · {cerrados.length}
          </summary>
          <Card padding="none" className="mt-1.5">
            <ul className="min-w-0">
              {cerrados.map((inscrito) => (
                <li
                  key={inscrito.id}
                  className="flex min-w-0 items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1 truncate text-body text-ink-secondary">
                    {nombreVisible(inscrito.leadName)}
                  </span>
                  <span className="shrink-0 text-micro text-ink-muted">
                    {inscrito.exitReason ? ETIQUETA_SALIDA[inscrito.exitReason] : 'Salio'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </details>
      )}
    </div>
  );
}
