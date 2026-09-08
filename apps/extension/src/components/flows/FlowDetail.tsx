import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  IconButton,
  Input,
  ListPagination,
  ListPanel,
  ListRow,
  Select,
} from '../../design';
import { Icon } from '../../utils/icons';
import { nombreCorto, nombreVisible } from '../../utils/leadDisplay';
import { FlowProgressRail, MAX_PASOS_RIEL } from './FlowProgressRail';
import { fetchEnrollments, fetchProgress } from '../../services/messageFlowsService';
import { computeFlowProgress, estadosDePasos, tocaAhora } from '../../services/flowProgress';
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

/** Dia y mes: en esta lista la hora no cambia ninguna decision. */
const FECHA_INSCRITO = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' });

/**
 * Cuantos inscritos por pagina.
 *
 * Doce, que es lo que entra sin empujar el pie fuera de la ventana contando lo
 * que esta pantalla lleva encima: cabecera del flujo, sus botones, la lista de
 * pasos y la fila de filtros.
 */
const INSCRITOS_POR_PAGINA = 12;

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
  /*
   * El reloj se lee UNA vez por render y se pasa a `tocaAhora`, que es pura y
   * no lo lee por su cuenta. Dentro del bucle darian marcas distintas para
   * filas de la misma pantalla, y en el limite de un minuto dos inscritos con
   * el mismo vencimiento se contarian distinto.
   */
  const ahora = new Date();
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

  /*
   * BUSCAR, FILTRAR POR ETAPA Y PAGINAR.
   *
   * La lista pintaba a los inscritos enteros, sin corte. Con dieciocho ya
   * obliga a scrollear; con doscientos es una lista infinita en la unica
   * pantalla donde uno viene a buscar a UNA persona -"¿por que paso va
   * Marcela?"- y no habia ni caja de busqueda.
   *
   * El filtro es por ETAPA y no por flujo: esta vista ya es la de un flujo
   * concreto, asi que "elegir entre flujos" aqui no acota nada. Lo que si
   * acota es "mostrame a los que van por el paso 2", que es como se lee una
   * cohorte y como se decide a quien empujar.
   */
  const [busqueda, setBusqueda] = useState('');
  const [etapa, setEtapa] = useState<string>('');
  const [pagina, setPagina] = useState(1);

  /** En que paso esta cada inscripcion, para poder filtrar y pintar sin repetir. */
  const avancePorInscrito = new Map(
    activos.map((inscrito) => [
      inscrito.id,
      computeFlowProgress(
        pasos,
        progreso.filter((p) => p.enrollmentId === inscrito.id),
      ),
    ]),
  );

  const q = busqueda.trim().toLocaleLowerCase('es');
  const filtrados = activos.filter((inscrito) => {
    const suPaso = avancePorInscrito.get(inscrito.id)?.siguiente?.stepOrder ?? null;
    if (etapa === 'terminados' ? suPaso !== null : etapa && String(suPaso) !== etapa) return false;
    return q ? nombreVisible(inscrito.leadName).toLocaleLowerCase('es').includes(q) : true;
  });

  /* Al filtrar, la pagina 4 puede dejar de existir. Se ajusta durante el
     render, no en un efecto que pintaria la pagina vieja antes de corregirse. */
  const filtroActual = `${q}|${etapa}`;
  const [filtroAnterior, setFiltroAnterior] = useState(filtroActual);
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setPagina(1);
  }

  /** Cuantos inscritos hay en una etapa. `null` = ya terminaron el flujo. */
  const contarEnEtapa = (stepOrder: number | null): number =>
    activos.filter((i) => (avancePorInscrito.get(i.id)?.siguiente?.stepOrder ?? null) === stepOrder)
      .length;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / INSCRITOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice(
    (paginaActual - 1) * INSCRITOS_POR_PAGINA,
    paginaActual * INSCRITOS_POR_PAGINA,
  );

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
          Pausado: sus pasos no aparecen en Hoy hasta que lo reanudes. Los inscritos conservan su progreso.
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
        {activos.length === 0 ? (
          <>
            <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
              Inscritos
            </span>
            <p className="text-micro text-ink-muted">
              Nadie inscrito todavia. Al inscribir se elige en que paso empieza cada lead: los
              anteriores quedan como hechos y ese queda programado.
            </p>
          </>
        ) : (
          <>
            {/* Buscador y etapa en una fila. El selector solo con mas de un
                paso: con uno, filtrar por etapa no acota nada. */}
            <div className="flex items-center gap-1.5">
              <Input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar inscrito..."
                aria-label="Buscar entre los inscritos"
                className="flex-1"
              />
              {pasos.length > 1 && (
                <Select
                  value={etapa}
                  onChange={(evento) => setEtapa(evento.target.value)}
                  compact
                  fullWidth={false}
                  aria-label="Ver solo una etapa del flujo"
                  className="w-[128px]"
                >
                  <option value="">Todas ({activos.length})</option>
                  {pasos.map((paso) => (
                    <option key={paso.id} value={String(paso.stepOrder)}>
                      Paso {paso.stepOrder} ({contarEnEtapa(paso.stepOrder)})
                    </option>
                  ))}
                  <option value="terminados">Terminados ({contarEnEtapa(null)})</option>
                </Select>
              )}
            </div>

            <ListPanel
              title="Inscritos"
              count={filtrados.length}
              footer={
                <ListPagination
                  page={paginaActual}
                  pageCount={totalPaginas}
                  onPageChange={setPagina}
                />
              }
              empty={
                <p className="px-3 py-6 text-center text-micro text-ink-muted">
                  Ningun inscrito coincide con el filtro.
                </p>
              }
            >
              {visibles.map((inscrito) => {
                const suyo = progreso.filter((p) => p.enrollmentId === inscrito.id);
                const estados = estadosDePasos(pasos, suyo);
                const avance = avancePorInscrito.get(inscrito.id);
                const nombre = nombreVisible(inscrito.leadName);
                const siguiente = avance?.siguiente ?? null;
                const urgente = avance !== undefined && siguiente !== null && tocaAhora(avance, ahora);

                return (
                  <ListRow key={inscrito.id} className="flex-wrap gap-1.5">
                    {/*
                      UNA SOLA LINEA. Antes eran dos bloques apilados -nombre y
                      boton arriba, riel y estado abajo- y unos 70px por fila.

                      El nombre va abreviado con la misma regla que el resto de
                      la aplicacion: "Henry Jose Daniel Farias Pacheco" ocupaba
                      la fila entera y dejaba al riel y a la fecha sin sitio. El
                      completo queda en el `title`.
                    */}
                    <span
                      className="min-w-0 flex-1 truncate text-body font-semibold text-ink"
                      title={nombre}
                    >
                      {nombreCorto(nombre)}
                    </span>

                    {/* Por encima de doce pasos el riel deja de leerse y se
                        cambia por el conteo, que informa lo mismo peor pero sin
                        mentir. */}
                    {pasos.length <= MAX_PASOS_RIEL ? (
                      <FlowProgressRail estados={estados} esCorreo={esCorreo} />
                    ) : (
                      <span className="shrink-0 text-micro tabular-nums text-ink-secondary">
                        {estados.filter((e) => e !== 'pendiente' && e !== 'toca').length} de{' '}
                        {pasos.length}
                      </span>
                    )}

                    {/*
                      "N de M" desaparece cuando el riel esta: era su
                      transcripcion literal y le robaba el ancho a la fecha, que
                      es el dato que no se puede deducir mirando el riel.
                    */}
                    <span
                      className={`shrink-0 text-micro tabular-nums ${
                        urgente ? 'text-state-warning-ink' : 'text-ink-secondary'
                      }`}
                    >
                      {siguiente === null
                        ? 'Terminado'
                        : urgente
                          ? `Paso ${siguiente.stepOrder} · ya`
                          : avance?.venceAt
                            ? `Paso ${siguiente.stepOrder} · ${FECHA_INSCRITO.format(
                                new Date(avance.venceAt),
                              )}`
                            : `Paso ${siguiente.stepOrder}`}
                    </span>

                    <IconButton
                      icon={<Icon.Close />}
                      label={`Sacar a ${nombre} del flujo`}
                      size="sm"
                      variant="ghost-danger"
                      onClick={() => setSacando(inscrito.id)}
                    />

                    {sacando === inscrito.id && (
                      /* El formulario de salida rompe la linea y toma el ancho
                         entero: es una decision, no un dato de la fila. */
                      <div className="flex w-full flex-col gap-2 rounded-md border border-line bg-surface-sunken p-2.5">
                        <label
                          className="text-micro text-ink-secondary"
                          htmlFor={`motivo-${inscrito.id}`}
                        >
                          ¿Por que sale del flujo?
                        </label>
                        <Select
                          id={`motivo-${inscrito.id}`}
                          value={motivoSalida}
                          onChange={(e) => setMotivoSalida(e.target.value as ExitReason)}
                        >
                          {MOTIVOS_SALIDA.map((m) => (
                            <option key={m.valor} value={m.valor}>
                              {m.label}
                            </option>
                          ))}
                        </Select>
                        <p className="text-micro text-ink-muted">
                          Los pasos que faltan se cancelan. Lo ya registrado se conserva.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => setSacando(null)}>
                            Cancelar
                          </Button>
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
                  </ListRow>
                );
              })}
            </ListPanel>
          </>
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
