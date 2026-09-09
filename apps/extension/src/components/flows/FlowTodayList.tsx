import { useState } from 'react';
import {
  Button,
  EmptyState,
  IconButton,
  ListPagination,
  ListPanel,
  ListRow,
  Select,
} from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import type { FlowChannel, PendingFlowStep } from '../../types';
import type { EstadoDelCupo } from '../../services/whatsappQuota';

/**
 * LO QUE TOCA MANDAR HOY.
 *
 * ## Por que pagina y filtra
 *
 * Pintaba la cola entera, sin tope ni filtro. Con dos flujos que coinciden un
 * dia eso son cuatrocientas filas seguidas y la unica forma de decidir a quien
 * escribirle es scrollear a ciegas. Es la pantalla de entrada de la seccion y
 * la que mas filas tiene, y era la unica de las tres listas de leads que no
 * paginaba: el selector de destinatarios lo hace de a ocho y la de inscribir de
 * a diez.
 *
 * El filtro por flujo es lo que permite la decision real del dia: con cupo para
 * cincuenta y cuatrocientos vencidos, lo primero que uno quiere es "hoy despacho
 * el flujo de reactivacion", y sin filtro eso no se puede ni intentar.
 */

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

/** El verbo corto que entra en la fila. El largo vive en el `title`. */
const ACCION_CORTA: Record<FlowChannel, string> = {
  whatsapp: 'Abrir',
  email: 'Enviar',
  call: 'Marcar',
};

/** Filas por pagina en cada seccion. */
const FILAS_POR_PAGINA = 10;

const FECHA_CORTA = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' });

/** El dia local como `YYYY-MM-DD`, para comparar contra los dias de la base. */
function fechaLocal(momento: Date): string {
  const mes = String(momento.getMonth() + 1).padStart(2, '0');
  const dia = String(momento.getDate()).padStart(2, '0');
  return `${momento.getFullYear()}-${mes}-${dia}`;
}

/**
 * Un `YYYY-MM-DD` como fecha LOCAL, no como instante UTC.
 *
 * `new Date("2026-09-09")` da medianoche UTC, que en Santiago es el 8 a las
 * 21:00: formateado se veia "8/9" para un dia que era el 9. La base ya agrupa
 * en la zona de quien mira -migracion 170-, asi que aqui solo hay que dejar de
 * torcerlo al leerlo.
 */
function comoFechaLocal(dia: string): Date {
  const [anio, mes, numero] = dia.split('-').map(Number);
  return new Date(anio ?? 1970, (mes ?? 1) - 1, numero ?? 1);
}

interface Props {
  cola: PendingFlowStep[];
  ahora: Date;
  onDespachar: (fila: PendingFlowStep) => void;
  onOmitir: (fila: PendingFlowStep) => void;
  onIrAFlujos: () => void;
  /** Como esta el cupo de WhatsApp de hoy. */
  cupo: EstadoDelCupo;
  /** Reparte en los proximos dias lo que no cabe. */
  onRepartir: () => Promise<void>;
  /** Cuantos pasos de la cola se moverian al repartir. Cero = todo cabe. */
  seMoverian: number;
  /** Que vence cada uno de los proximos dias. Explica una vista vacia. */
  proximos: Array<{ dia: string; cantidad: number }>;
  /** Manda un grupo entero -misma plantilla- de a uno con la cola guiada. */
  onDespacharGrupo: (filas: PendingFlowStep[]) => void;
  /** Hay una tanda en curso: no se puede empezar otra. */
  tandaEnCurso: boolean;
  /** Trae a ahora lo que vencia hasta esa fecha. La espera es una intencion. */
  onAdelantar: (hasta: Date, cuantos: number, esHoy: boolean) => void;
}

export function FlowTodayList({
  cola,
  ahora,
  onDespachar,
  onOmitir,
  onIrAFlujos,
  cupo,
  onRepartir,
  seMoverian,
  proximos,
  onDespacharGrupo,
  tandaEnCurso,
  onAdelantar,
}: Props) {
  const [verFlujo, setVerFlujo] = useState<string>('');
  const [paginaAtrasados, setPaginaAtrasados] = useState(1);
  const [paginaDeHoy, setPaginaDeHoy] = useState(1);

  if (cola.length === 0) {
    /*
     * UN VACIO QUE EXPLICA POR QUE ESTA VACIO.
     *
     * Decia "Nada pendiente por ahora" y nada mas. Con dieciocho personas
     * inscritas esperando el paso 2, eso se lee como "el sistema perdio mis
     * pendientes". No era falso -hoy no habia nada vencido- pero era la mitad
     * de la frase, y la que faltaba es la que devuelve la confianza: cuando si.
     */
    /*
     * La comparacion es entre CADENAS de fecha, no entre instantes.
     *
     * `dia.dia` viene como "2026-09-08" y `new Date()` de eso da medianoche
     * UTC, que en Chile es la tarde del dia anterior. Comparado contra la
     * medianoche local, un dia entero podia caer del lado equivocado y la
     * pantalla saltarse el primero. Dos cadenas `YYYY-MM-DD` se ordenan solas y
     * no tienen zona horaria que las tuerza.
     */
    const hoy = fechaLocal(ahora);
    const siguiente = proximos.find((dia) => dia.dia >= hoy);
    const enEspera = proximos.reduce((total, dia) => total + dia.cantidad, 0);

    /*
     * VENCE HOY MAS TARDE, o vence otro dia. No es lo mismo y la pantalla lo
     * decia igual.
     *
     * La espera de un paso arrastra la HORA del envio anterior: si el paso 1
     * salio a las 14:00 y espera 3 dias, el 2 vence hoy a las 14:00. A las 8 de
     * la mañana la cola no lo da por vencido -y hace bien-, pero el cartel
     * decia "traer 17 a hoy" cuando la fecha pautada YA era hoy, que leido asi
     * no significa nada.
     *
     * Con `esHoy` el mensaje cambia: no hay que traer nada, hay que esperar
     * unas horas, y el boton pasa a ser lo que de verdad hace -mandarlos antes
     * de tiempo- por si no vas a poder mas tarde.
     */
    const esHoy = siguiente?.dia === hoy;

    return (
      <EmptyState
        title={esHoy ? 'Todavía no toca nada' : 'Hoy no toca nada'}
        description={
          !siguiente
            ? 'No hay pasos programados. Inscribe gente en un flujo para que aparezcan aquí el día que les toque.'
            : esHoy
              ? `${siguiente.cantidad} ${siguiente.cantidad === 1 ? 'mensaje vence' : 'mensajes vencen'} hoy más tarde: la espera del flujo cuenta también la hora del envío anterior. Van a aparecer aquí solos.`
              : `Lo próximo son ${siguiente.cantidad} ${siguiente.cantidad === 1 ? 'mensaje' : 'mensajes'} el ${FECHA_CORTA.format(comoFechaLocal(siguiente.dia))}.${
                  enEspera > siguiente.cantidad ? ` En total hay ${enEspera} programados.` : ''
                }`
        }
        action={
          /*
            "Traerlos a hoy" es la salida que faltaba.
            
            La espera del flujo es una intencion, no una ley: si hay cupo libre y
            manana no vas a poder, mandarlos hoy es una decision legitima y hasta
            ahora no habia forma de tomarla. Sin esto, ver diecisiete personas
            esperando y no poder hacer nada es lo que convierte la pantalla en
            una que solo informa.

            Es la accion principal cuando hay algo que adelantar, y "Ver mis
            flujos" pasa a segundo plano: quien entra aca con la lista vacia
            viene a mandar, no a mirar la configuracion.
          */
          siguiente ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant={esHoy ? 'secondary' : 'primary'}
                onClick={() => onAdelantar(comoFechaLocal(siguiente.dia), siguiente.cantidad, esHoy)}
                title={
                  esHoy
                    ? 'Los adelanta unas horas, en vez de esperar a su hora'
                    : 'Los trae al día de hoy, sin esperar a su fecha'
                }
              >
                {esHoy ? `Mandar los ${siguiente.cantidad} ya` : `Traer ${siguiente.cantidad} a hoy`}
              </Button>
              <Button variant="ghost" onClick={onIrAFlujos}>
                Ver mis flujos
              </Button>
            </div>
          ) : (
            <Button onClick={onIrAFlujos}>Ver mis flujos</Button>
          )
        }
      />
    );
  }

  /* Los flujos presentes en la cola, para el selector. Salen de la cola misma:
     ofrecer flujos que hoy no tienen nada seria ofrecer filtros vacios. */
  const flujosEnLaCola = [...new Map(cola.map((f) => [f.flowId, f.flowName])).entries()];

  const filtrada = verFlujo ? cola.filter((fila) => fila.flowId === verFlujo) : cola;
  const atrasados = filtrada.filter((f) => diasDeAtraso(f.dueAt, ahora) > 0);
  const deHoy = filtrada.filter((f) => diasDeAtraso(f.dueAt, ahora) <= 0);

  const seccion = (
    titulo: string,
    filas: PendingFlowStep[],
    pagina: number,
    setPagina: (p: number) => void,
  ) => {
    if (filas.length === 0) return null;

    const totalPaginas = Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA));
    const actual = Math.min(pagina, totalPaginas);
    const visibles = filas.slice((actual - 1) * FILAS_POR_PAGINA, actual * FILAS_POR_PAGINA);

    /*
     * LOS GRUPOS: mismo flujo y mismo paso, o sea la MISMA PLANTILLA.
     *
     * Es lo que convierte "toca hoy" en algo que se puede hacer. Cuarenta y
     * siete personas que reciben el mismo texto son una tanda; de a un boton
     * por fila son cuarenta y siete idas y vueltas.
     *
     * Se agrupa dentro de la seccion y no sobre la cola entera a proposito: un
     * atrasado de nueve dias y uno que vence hoy no son la misma urgencia
     * aunque compartan plantilla, y mezclarlos esconderia el atraso.
     */
    const grupos = [
      ...filas
        .reduce((mapa, fila) => {
          const clave = `${fila.flowId}|${fila.stepOrder}`;
          mapa.set(clave, [...(mapa.get(clave) ?? []), fila]);
          return mapa;
        }, new Map<string, PendingFlowStep[]>())
        .values(),
    ].filter((grupo) => grupo.length > 1);

    return (
      <ListPanel
        title={titulo}
        count={filas.length}
        footer={
          <ListPagination page={actual} pageCount={totalPaginas} onPageChange={setPagina} />
        }
      >
        {/*
          Las tandas van arriba de las filas: son el camino rapido, y quien
          entra a esta pantalla con cuarenta pendientes quiere eso antes que
          la lista. Con un solo destinatario no se ofrece: para uno ya esta su
          propio boton, dos clics mas abajo.
        */}
        {grupos.map((grupo) => {
          const cabeza = grupo[0]!;
          const sinCupo = cabeza.channel === 'whatsapp' && cupo.agotado;
          const entran =
            cabeza.channel === 'whatsapp' ? Math.min(grupo.length, cupo.quedan) : grupo.length;

          return (
            <ListRow key={`tanda-${cabeza.flowId}-${cabeza.stepOrder}`} className="bg-surface-sunken">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">
                  {cabeza.templateName}
                </span>
                <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                  {cabeza.flowName} · paso {cabeza.stepOrder} · {grupo.length}{' '}
                  {grupo.length === 1 ? 'persona' : 'personas'}
                  {entran < grupo.length ? ` · hoy entran ${entran}` : ''}
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={sinCupo || tandaEnCurso || entran === 0}
                onClick={() => onDespacharGrupo(grupo)}
                className="shrink-0"
                title={
                  sinCupo
                    ? `Ya van ${cupo.usados} de ${cupo.tope} mensajes hoy.`
                    : `Abre los chats de a uno: mandas, vuelves, y se abre el siguiente.`
                }
              >
                {cabeza.channel === 'whatsapp' ? `Abrir ${entran}, de a uno` : `Enviar ${entran}`}
              </Button>
            </ListRow>
          );
        })}

        {visibles.map((fila) => {
          const atraso = diasDeAtraso(fila.dueAt, ahora);
          const sinCupo = fila.channel === 'whatsapp' && cupo.agotado;

          return (
            <ListRow key={fila.progressId} className="gap-1.5">
              {/* El nombre del flujo se va al tooltip: en la fila competia con
                  la plantilla, que es el dato que dice QUE se manda. */}
              <div
                className="min-w-0 flex-1"
                title={`${fila.flowName} · paso ${fila.stepOrder} · ${fila.templateName}`}
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
                    {nombreVisible(fila.leadName)}
                  </span>
                  {/*
                    Solo el atraso, y solo si lo hay. "Toca hoy" repetia en cada
                    fila lo que ya dice el titulo de su seccion, y de tanto
                    repetirse tapaba el dato que si cambia entre filas.
                  */}
                  {atraso > 0 && (
                    <span className="shrink-0 text-micro font-medium tabular-nums text-state-warning-ink">
                      {atraso}d
                    </span>
                  )}
                </div>
                {/* La PLANTILLA es lo que dice que se va a mandar, asi que se
                    queda; el nombre del flujo se va al tooltip y al filtro. */}
                <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                  paso {fila.stepOrder} · {fila.templateName}
                </span>
              </div>

              <Button
                size="sm"
                variant="primary"
                disabled={sinCupo}
                onClick={() => onDespachar(fila)}
                className="min-w-[72px] shrink-0 justify-center"
                title={
                  sinCupo
                    ? `Ya van ${cupo.usados} de ${cupo.tope} mensajes hoy. Sigue mañana o sube el tope en Ajustes.`
                    : ACCION[fila.channel]
                }
              >
                {ACCION_CORTA[fila.channel]}
              </Button>

              {/* Omitir es irreversible -"no se puede volver a programar"-, asi
                  que se pinta como lo que es y no como un icono mas. */}
              <IconButton
                icon={<Icon.Close />}
                label={`Omitir este paso para ${nombreVisible(fila.leadName)}`}
                size="sm"
                variant="ghost-danger"
                onClick={() => onOmitir(fila)}
              />
            </ListRow>
          );
        })}
      </ListPanel>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {/*
        EL CUPO DEL DIA, arriba de todo y siempre.

        Va antes que la cola porque es el dato que decide si hoy se manda o no:
        enterarse en el mensaje 51, cuando WhatsApp ya te miro raro, no sirve.

        Cuenta TODO el WhatsApp del dia, no solo el de flujos: el limite es de
        la cuenta. Si mandaste 40 a mano desde Enviar, aqui quedan 10.
      */}
      {/*
        La barra del cupo solo aparece si hoy hay WhatsApp que mandar.
        
        El tope es de WhatsApp -un correo no gasta cupo de WhatsApp- asi que a
        quien tiene solo flujos de correo le decia "0 de 50 mensajes de WhatsApp
        hoy" en una pantalla donde no hay ni un WhatsApp. Un dato que no aplica,
        en el sitio de mas jerarquia de la vista.
      */}
      {cola.some((fila) => fila.channel === 'whatsapp') && (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2">
        <span className={`text-micro ${cupo.agotado ? 'text-state-warning-ink' : 'text-ink-secondary'}`}>
          <span className="font-semibold tabular-nums">
            {cupo.usados} de {cupo.tope}
          </span>{' '}
          {cupo.agotado ? 'mensajes: el cupo de hoy se acabó' : 'mensajes de WhatsApp hoy'}
        </span>

        {seMoverian > 0 && (
          <Button size="sm" variant="secondary" onClick={onRepartir} className="shrink-0">
            Repartir {seMoverian} en los próximos días
          </Button>
        )}
      </div>
      )}

      {/* Con un solo flujo el selector no acota nada: es ruido. */}
      {flujosEnLaCola.length > 1 && (
        <Select
          value={verFlujo}
          onChange={(evento) => {
            setVerFlujo(evento.target.value);
            setPaginaAtrasados(1);
            setPaginaDeHoy(1);
          }}
          compact
          aria-label="Ver solo los pasos de un flujo"
          className="min-w-0"
        >
          <option value="">Todos los flujos ({cola.length})</option>
          {flujosEnLaCola.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre} ({cola.filter((f) => f.flowId === id).length})
            </option>
          ))}
        </Select>
      )}

      {seccion('Atrasados', atrasados, paginaAtrasados, setPaginaAtrasados)}
      {seccion('Para hoy', deHoy, paginaDeHoy, setPaginaDeHoy)}
    </div>
  );
}
