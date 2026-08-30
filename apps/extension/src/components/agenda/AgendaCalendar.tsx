import { useEffect, useMemo, useState } from 'react';
import type { AgendaAppointment } from '../../types';
import { Button, IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import {
  ESTADO_DE_CITA,
  formatDateTime,
} from './agendaFormat';
import {
  agruparPorDia,
  claveDeDia,
  diasDeLaGrillaMensual,
  diasDeLaSemana,
  duracionEnMinutos,
  esElMismoDia,
  minutosDesdeMedianoche,
} from '../../utils/agendaGrid';

export type VistaDeCalendario = 'dia' | 'semana' | 'mes';

/** Alto de una hora en la vista dia, en pixeles. */
const PX_POR_HORA = 56;

/** De que hora a que hora se dibuja. Fuera de esto no hay rejilla. */
const HORA_INICIO = 8;
const HORA_FIN = 20;

const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const INICIALES = ['l', 'm', 'm', 'j', 'v', 's', 'd'];

const MES_LARGO = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
const DIA_LARGO = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const DIA_CORTO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });

function soloHora(iso: string): string {
  const fecha = new Date(iso);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/**
 * EL CALENDARIO DE LA AGENDA
 *
 * Tres vistas -dia, semana, mes- sobre las mismas citas.
 *
 * ## La restriccion que decide todo: 336px
 *
 * Siete columnas dan celdas de 48px. En 48px no entra ni una hora ni un nombre.
 * Asi que cada vista sacrifica algo distinto, y conviene saber que:
 *
 *  - **Dia**: no sacrifica casi nada. Rejilla horaria de verdad, con el nombre
 *    completo. Es la vista util.
 *  - **Semana**: la semana se gira 90 grados. Siete FILAS, no columnas: una
 *    columna de dia da 48px para dibujar; una fila da 286. Son casi seis veces
 *    mas resolucion. El precio es que los bloques no llevan texto: a 12px por
 *    media hora no entra una letra, y fingir que si es dibujar puntitos que hay
 *    que tocar para saber que son.
 *  - **Mes**: solo dice CUANTAS y de que signo. Ni titulo ni hora. Un dia con
 *    tres citas a las 9 y otro con tres a las 18 se ven igual; esa distincion
 *    vive en las otras dos vistas.
 *
 * ## Las canceladas no se dibujan
 *
 * Ocuparian un horario que en realidad esta libre, que es lo contrario de para
 * que sirve un calendario. Siguen en su bloque de la lista.
 */
export function AgendaCalendar({
  vista,
  appointments,
  onCambiarPeriodo,
  onAbrirCita,
}: {
  vista: VistaDeCalendario;
  /** Solo las que ocupan horario. Quien lo monta ya filtro las cerradas. */
  appointments: AgendaAppointment[];
  /** Avisa que periodo se esta mirando, para que se pidan esas citas. */
  onCambiarPeriodo: (desde: Date, hasta: Date) => void;
  onAbrirCita: (appointmentId: string) => void;
}) {
  const [ancla, setAncla] = useState(() => new Date());
  const [diaElegido, setDiaElegido] = useState(() => new Date());

  const hoy = new Date();

  const { desde, hasta, rotulo } = useMemo(() => {
    if (vista === 'dia') {
      return { desde: ancla, hasta: ancla, rotulo: DIA_LARGO.format(ancla) };
    }
    if (vista === 'semana') {
      const semana = diasDeLaSemana(ancla);
      const primero = semana[0]!;
      const ultimo = semana[6]!;
      return {
        desde: primero,
        hasta: ultimo,
        rotulo: `${DIA_CORTO.format(primero)} – ${DIA_CORTO.format(ultimo)}`,
      };
    }
    const celdas = diasDeLaGrillaMensual(ancla.getFullYear(), ancla.getMonth());
    return { desde: celdas[0]!, hasta: celdas[41]!, rotulo: MES_LARGO.format(ancla) };
  }, [vista, ancla]);

  /*
   * Se avisa el periodo cuando cambia, para que el hook pida esas citas. Las
   * dependencias son numeros y no `Date`: un objeto nuevo en cada render
   * dispararia la carga sin parar.
   */
  useEffect(() => {
    onCambiarPeriodo(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde.getTime(), hasta.getTime()]);

  const porDia = useMemo(() => agruparPorDia(appointments), [appointments]);

  const mover = (pasos: number) => {
    const proxima = new Date(ancla);
    if (vista === 'dia') proxima.setDate(proxima.getDate() + pasos);
    else if (vista === 'semana') proxima.setDate(proxima.getDate() + pasos * 7);
    else proxima.setMonth(proxima.getMonth() + pasos);
    setAncla(proxima);
  };

  const enElPeriodoActual =
    vista === 'dia'
      ? esElMismoDia(ancla, hoy)
      : vista === 'semana'
        ? claveDeDia(diasDeLaSemana(ancla)[0]!) === claveDeDia(diasDeLaSemana(hoy)[0]!)
        : ancla.getFullYear() === hoy.getFullYear() && ancla.getMonth() === hoy.getMonth();

  return (
    <div className="flex flex-col gap-2">
      {/* Navegacion temporal. "Hoy" no se dibuja si ya estás en el período:
          no existe en vez de estar apagado. */}
      <div className="flex items-center gap-1">
        <IconButton icon={<Icon.ChevronLeft />} label="Período anterior" size="sm" onClick={() => mover(-1)} />
        <p className="min-w-0 flex-1 truncate text-meta font-semibold text-ink first-letter:uppercase">
          {rotulo}
        </p>
        <IconButton icon={<Icon.ChevronRight />} label="Período siguiente" size="sm" onClick={() => mover(1)} />
        {!enElPeriodoActual && (
          <Button size="sm" onClick={() => { setAncla(new Date()); setDiaElegido(new Date()); }}>
            Hoy
          </Button>
        )}
      </div>

      {vista === 'dia' && <VistaDia dia={ancla} citas={porDia.get(claveDeDia(ancla)) ?? []} onAbrirCita={onAbrirCita} />}

      {vista === 'semana' && (
        <VistaSemana
          semana={diasDeLaSemana(ancla)}
          porDia={porDia}
          diaElegido={diaElegido}
          onElegirDia={setDiaElegido}
          onAbrirCita={onAbrirCita}
        />
      )}

      {vista === 'mes' && (
        <VistaMes
          celdas={diasDeLaGrillaMensual(ancla.getFullYear(), ancla.getMonth())}
          mesVisible={ancla.getMonth()}
          porDia={porDia}
          diaElegido={diaElegido}
          onElegirDia={setDiaElegido}
          onAbrirCita={onAbrirCita}
        />
      )}
    </div>
  );
}

/** El color del filete de una cita, segun su estado. */
function coloreDeEstado(status: string): string {
  return ESTADO_DE_CITA[status]?.color ?? 'bg-primary';
}

/** Las citas de un día, en filas de 32px. Lo comparten semana y mes. */
function DetalleDelDia({
  dia,
  citas,
  onAbrirCita,
}: {
  dia: Date;
  citas: AgendaAppointment[];
  onAbrirCita: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-micro text-ink-secondary first-letter:uppercase">
        {DIA_LARGO.format(dia)} · {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
      </p>

      {citas.length === 0 ? (
        <p className="rounded-md bg-surface-sunken px-3 py-3 text-center text-micro text-ink-secondary">
          Sin citas este día
        </p>
      ) : (
        <div className="divide-y divide-line-soft rounded-md border border-line">
          {citas.map((cita) => {
            const estado = ESTADO_DE_CITA[cita.status];
            return (
              <button
                key={cita.id}
                type="button"
                onClick={() => onAbrirCita(cita.id)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${coloreDeEstado(cita.status)}`} />
                <span className="shrink-0 text-meta tabular-nums text-ink-secondary">
                  {soloHora(cita.startsAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-meta font-medium text-ink">
                  {cita.leadName || 'Sin nombre'}
                </span>
                {estado && (
                  <span className="shrink-0 text-micro text-ink-secondary">{estado.rotulo}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * VISTA DÍA — rejilla horaria de verdad.
 *
 * 56px por hora y no 48: media hora son 28px, que es el alto del control mas
 * chico del sistema. A 48 una cita de media hora quedaria en 24px, por debajo
 * de lo que se puede tocar y leer.
 */
function VistaDia({
  dia,
  citas,
  onAbrirCita,
}: {
  dia: Date;
  citas: AgendaAppointment[];
  onAbrirCita: (id: string) => void;
}) {
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);

  /*
   * La rejilla va de 08 a 20. Una cita a las 07:00 no tiene donde dibujarse.
   *
   * Se cuentan aparte y se dicen al pie en vez de clavarlas en el borde: una
   * cita pegada a las 08:00 que en realidad es de las 07:00 miente sobre lo
   * unico que esta vista existe para contar, que es la hora. Desaparecer sin
   * mas tampoco vale -seria perder una cita-, asi que se nombran.
   */
  const dentroDeLaVentana = (cita: AgendaAppointment) => {
    const inicio = minutosDesdeMedianoche(cita.startsAt);
    return inicio >= HORA_INICIO * 60 && inicio < HORA_FIN * 60;
  };
  const enLaRejilla = citas.filter(dentroDeLaVentana);
  const fueraDeLaRejilla = citas.filter((cita) => !dentroDeLaVentana(cita));

  const ahora = new Date();
  const esHoy = esElMismoDia(dia, ahora);
  const minutosAhora = minutosDesdeMedianoche(ahora);
  const dentroDeLaRejilla = minutosAhora >= HORA_INICIO * 60 && minutosAhora <= HORA_FIN * 60;

  return (
    <div className="relative rounded-md border border-line bg-surface">
      {citas.length === 0 && (
        <p className="absolute inset-x-0 top-16 z-10 text-center text-body text-ink-secondary">
          Sin citas este día
        </p>
      )}

      <div className="relative" style={{ height: (HORA_FIN - HORA_INICIO) * PX_POR_HORA }}>
        {horas.map((hora, i) => (
          <div
            key={hora}
            className="absolute inset-x-0 border-t border-line-soft"
            style={{ top: i * PX_POR_HORA }}
          >
            <span className="absolute -top-2 left-2 text-micro tabular-nums text-ink-secondary">
              {String(hora).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* Ahora. Tres portadores: la posicion, la hora escrita y recien el color. */}
        {esHoy && dentroDeLaRejilla && (
          <div
            className="absolute inset-x-0 z-20 flex items-center"
            style={{ top: ((minutosAhora - HORA_INICIO * 60) / 60) * PX_POR_HORA }}
          >
            <span className="w-9 shrink-0 pl-1 text-micro font-semibold tabular-nums text-state-danger-ink">
              {soloHora(ahora.toISOString())}
            </span>
            <span aria-hidden="true" className="h-0.5 flex-1 bg-state-danger" />
          </div>
        )}

        {enLaRejilla.map((cita) => {
          const inicio = minutosDesdeMedianoche(cita.startsAt);
          const duracion = duracionEnMinutos(cita.startsAt, cita.endsAt);
          const top = ((inicio - HORA_INICIO * 60) / 60) * PX_POR_HORA;
          // Piso de 28px: una cita de 15 minutos daria 14px, por debajo de lo
          // que se puede tocar. Su hueco miente un poco y es preferible.
          const alto = Math.max((duracion / 60) * PX_POR_HORA, 28);

          return (
            <button
              key={cita.id}
              type="button"
              onClick={() => onAbrirCita(cita.id)}
              title={`${cita.leadName} · ${formatDateTime(cita.startsAt)}`}
              /* `style` y no clases: `top` y `height` salen de la hora, y una
                 clase de Tailwind armada en tiempo de ejecucion no genera CSS. */
              style={{ top, height: alto, left: 44, right: 6 }}
              className="absolute z-10 flex flex-col overflow-hidden rounded-md border border-line bg-primary-soft px-2 py-1 text-left"
            >
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${coloreDeEstado(cita.status)}`} />
              <span className="truncate pl-1 text-meta font-semibold text-ink">
                {cita.leadName || 'Sin nombre'}
              </span>
              {alto >= 44 && (
                <span className="truncate pl-1 text-micro tabular-nums text-ink-secondary">
                  {soloHora(cita.startsAt)} · {duracion} min
                </span>
              )}
            </button>
          );
        })}
      </div>

      {fueraDeLaRejilla.length > 0 && (
        <div className="border-t border-line-soft px-2 py-1.5">
          <p className="mb-1 text-micro text-ink-secondary">
            Fuera de {String(HORA_INICIO).padStart(2, '0')}:00–{HORA_FIN}:00
          </p>
          <div className="flex flex-wrap gap-1">
            {fueraDeLaRejilla.map((cita) => (
              <button
                key={cita.id}
                type="button"
                onClick={() => onAbrirCita(cita.id)}
                className="flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 transition-colors hover:bg-surface-hover"
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${coloreDeEstado(cita.status)}`} />
                <span className="text-micro tabular-nums text-ink-secondary">{soloHora(cita.startsAt)}</span>
                <span className="max-w-[110px] truncate text-micro font-medium text-ink">
                  {cita.leadName || 'Sin nombre'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * VISTA SEMANA — la semana girada 90 grados.
 *
 * Siete FILAS con el eje horario en horizontal. Una columna de dia daria 48px
 * para dibujar un bloque; una fila da 286. Casi seis veces mas resolucion, y las
 * cabeceras de dia entran sin apretarse.
 *
 * Los bloques NO llevan texto: media hora son 12px. Para saber quien, se toca el
 * dia y aparece abajo.
 */
function VistaSemana({
  semana,
  porDia,
  diaElegido,
  onElegirDia,
  onAbrirCita,
}: {
  semana: Date[];
  porDia: Map<string, AgendaAppointment[]>;
  diaElegido: Date;
  onElegirDia: (dia: Date) => void;
  onAbrirCita: (id: string) => void;
}) {
  const minutosDeLaVentana = (HORA_FIN - HORA_INICIO) * 60;
  const hoy = new Date();

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {/* La tira de horas, cada cuatro. Cada dos seria una reja que ensucia. */}
        <div className="flex items-center border-b border-line-soft pl-[46px] pr-1">
          {[8, 12, 16, 20].map((hora) => (
            <span key={hora} className="flex-1 py-1 text-micro tabular-nums text-ink-secondary">
              {String(hora).padStart(2, '0')}
            </span>
          ))}
        </div>

        {semana.map((dia) => {
          const citas = porDia.get(claveDeDia(dia)) ?? [];
          const esHoy = esElMismoDia(dia, hoy);
          const elegido = esElMismoDia(dia, diaElegido);

          return (
            <button
              key={claveDeDia(dia)}
              type="button"
              onClick={() => onElegirDia(dia)}
              aria-current={elegido ? 'true' : undefined}
              className={`flex h-11 w-full items-center border-b border-line-soft text-left transition-colors last:border-b-0 ${
                elegido ? 'bg-primary-soft' : 'hover:bg-surface-hover'
              }`}
            >
              <span className="w-[46px] shrink-0 pl-2">
                <span className={`block text-micro ${esHoy ? 'text-ink' : 'text-ink-secondary'}`}>
                  {DIAS_CORTOS[(dia.getDay() + 6) % 7]}
                </span>
                <span
                  className={`block text-meta tabular-nums ${esHoy ? 'font-semibold text-ink' : 'text-ink-secondary'}`}
                >
                  {dia.getDate()}
                </span>
              </span>

              <span className="relative h-full min-w-0 flex-1 pr-1">
                {citas.map((cita) => {
                  const inicio = minutosDesdeMedianoche(cita.startsAt) - HORA_INICIO * 60;
                  const duracion = duracionEnMinutos(cita.startsAt, cita.endsAt);
                  const izquierda = (inicio / minutosDeLaVentana) * 100;
                  const ancho = Math.max((duracion / minutosDeLaVentana) * 100, 3);

                  /*
                   * Fuera de la franja no se dibuja, y NO se clava al borde: en
                   * un eje horario, poner un bloque en una hora que no es su
                   * hora es peor que no ponerlo. El contador de la derecha las
                   * sigue contando y el detalle de abajo las lista, asi que la
                   * cita no se pierde: solo no tiene marca en el eje.
                   */
                  if (izquierda < 0 || izquierda >= 100) return null;

                  return (
                    <span
                      key={cita.id}
                      aria-hidden="true"
                      className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm ${coloreDeEstado(cita.status)}`}
                      style={{ left: `${izquierda}%`, width: `${ancho}%` }}
                    />
                  );
                })}
              </span>

              {citas.length > 0 && (
                <span className="w-5 shrink-0 pr-1 text-right text-micro tabular-nums text-ink-secondary">
                  {citas.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <DetalleDelDia dia={diaElegido} citas={porDia.get(claveDeDia(diaElegido)) ?? []} onAbrirCita={onAbrirCita} />
    </div>
  );
}

/**
 * VISTA MES — 42 celdas de 47x44.
 *
 * En una celda de ese tamano entran dos lineas: el numero del dia y un contador
 * con su punto. Nada mas.
 *
 * Un contador y no puntitos: tres puntos no distinguen 3 de 6, y el digito si.
 * El punto lleva el estado mas urgente del dia, asi que el color acompana pero
 * no informa solo.
 */
function VistaMes({
  celdas,
  mesVisible,
  porDia,
  diaElegido,
  onElegirDia,
  onAbrirCita,
}: {
  celdas: Date[];
  mesVisible: number;
  porDia: Map<string, AgendaAppointment[]>;
  diaElegido: Date;
  onElegirDia: (dia: Date) => void;
  onAbrirCita: (id: string) => void;
}) {
  const hoy = new Date();

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line-soft">
          {INICIALES.map((inicial, i) => (
            <span key={i} className="py-1 text-center text-micro text-ink-secondary">
              {inicial}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celdas.map((dia) => {
            const citas = porDia.get(claveDeDia(dia)) ?? [];
            const deOtroMes = dia.getMonth() !== mesVisible;
            const esHoy = esElMismoDia(dia, hoy);
            const elegido = esElMismoDia(dia, diaElegido);
            const masUrgente = citas[0];

            return (
              <button
                key={claveDeDia(dia)}
                type="button"
                onClick={() => onElegirDia(dia)}
                aria-current={elegido ? 'true' : undefined}
                aria-label={`${dia.getDate()}, ${citas.length} citas`}
                className={`flex h-11 flex-col items-center justify-center border-b border-r border-line-soft transition-colors ${
                  elegido ? 'ring-1 ring-inset ring-focus' : ''
                } ${esHoy ? 'bg-primary-soft' : 'hover:bg-surface-hover'}`}
              >
                <span
                  className={`text-meta tabular-nums ${
                    esHoy
                      ? 'font-semibold text-primary-ink'
                      : deOtroMes
                        ? 'text-ink-secondary'
                        : 'font-medium text-ink'
                  }`}
                >
                  {dia.getDate()}
                </span>

                {/* Sin citas no hay segunda linea. La ausencia se lee mas rapido
                    que un cero. */}
                {citas.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <span
                      aria-hidden="true"
                      className={`h-1 w-1 rounded-full ${coloreDeEstado(masUrgente!.status)}`}
                    />
                    <span className="text-micro tabular-nums text-ink-secondary">{citas.length}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DetalleDelDia dia={diaElegido} citas={porDia.get(claveDeDia(diaElegido)) ?? []} onAbrirCita={onAbrirCita} />
    </div>
  );
}
