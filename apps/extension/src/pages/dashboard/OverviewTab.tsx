import type { AppSettings, Page } from '../../types';
import type { DashboardSnapshot } from '../../services/dashboardService';
import GoalRingCard from '../../components/dashboard/GoalRingCard';
import ConversionBar from '../../components/dashboard/ConversionBar';
import MetricCard from '../../components/dashboard/MetricCard';
import AlertCard from '../../components/dashboard/AlertCard';
import { Icon } from '../../utils/icons';
import { chartColors } from '../../design/palette';
import { Card } from '../../design';
import { CardTitle } from '../../design';
import { useAuth } from '../../contexts/AuthContext';
import { calcularTendencia } from '../../components/dashboard/trend';
import { nombreDePeriodo } from '../../components/dashboard/comparePeriod';
import type { ComparePeriod } from '../../types';

/** Como se llama cada origen en pantalla. */
/**
 * Como se nombra cada origen.
 *
 * `web_form` se quedo por si queda algun lead sin reclasificar: hasta la
 * migracion 178 todo lo que entraba por un formulario caia bajo esa clave, y
 * "Formulario 100%" no distinguia al que llego por su cuenta desde la web del
 * que llego por un anuncio que se pago.
 */
const ETIQUETAS_ORIGEN: Record<string, string> = {
  manual: 'Manual',
  imported: 'Importado',
  form_web: 'Web',
  form_campaign: 'Campañas',
  form_retiro: 'Retiro',
  web_form: 'Formulario',
};

/** Barras del panel de fuentes, de mas a menos peso visual. */
const BARRAS_FUENTE = ['bg-primary', 'bg-primary-light', 'bg-primary-soft-strong', 'bg-primary-soft'];

/** Etapas del embudo, en el orden en que se recorren. */
const ETAPAS: Array<{ clave: string; etiqueta: string }> = [
  { clave: 'nuevo', etiqueta: 'Nuevo' },
  { clave: 'contactado', etiqueta: 'Contactado' },
  { clave: 'interesado', etiqueta: 'Interesado' },
  { clave: 'convertido', etiqueta: 'Convertido' },
];

interface OverviewTabProps {
  snapshot: DashboardSnapshot;
  settings: AppSettings;
  compareLabel: string;
  /** La ventana elegida, para nombrarla en los titulos. */
  periodo: ComparePeriod;
  onNavigate?: (page: Page) => void;
}

export default function OverviewTab({ snapshot, settings, compareLabel, periodo, onNavigate }: OverviewTabProps) {
  const { hasFeature } = useAuth();
  const { leadSummary, sendSummary, taskSummary } = snapshot;

  /*
   * Las metas leen `hoy`, no la ventana.
   *
   * El tope de WhatsApp es un tope POR DIA: con "ultimos 7 dias" elegido,
   * escalar la meta a 350 permitiria mandarlos todos el lunes y salir "dentro
   * de la meta" mientras te bloquean la cuenta. Esta tarjeta se queda en hoy
   * siempre, y su titulo lo dice.
   */
  const waToday = sendSummary.hoy.whatsapp;
  const emailToday = sendSummary.hoy.email;
  const callToday = sendSummary.hoy.call;

  /**
   * Los anillos de metas pasaban `waToday - compare` con un `%` pegado detras,
   * asi que cinco mensajes mas que ayer se mostraban como "5%". Ahora es el
   * mismo calculo que el resto del panel.
   */
  /*
   * Sin tendencia en los anillos.
   *
   * La comparacion que trae el snapshot es la de la VENTANA, y estos numeros
   * son de hoy: comparar los envios de hoy contra los de los treinta dias
   * anteriores daria un "-97%" que no significa nada. Comparar hoy contra ayer
   * pediria un tercer conjunto de cifras en el RPC para una flecha en una
   * tarjeta que ya dice "2 / 50" -que es la informacion que importa aqui-.
   */

  const totalLeads = leadSummary.total;
  const contacted = leadSummary.contacted;
  const converted = leadSummary.converted;
  const forgottenCount = leadSummary.forgotten;

  /**
   * Los tres paneles de abajo estuvieron hasta el `2026-08-14` escritos a mano
   * en el JSX: Web 100%, "Nuevo 592", "Mejor mes: Julio (596)". Eran las cifras
   * de una maqueta y no cambiaban con la cuenta que estuviera abierta.
   *
   * El dato ya venia en el snapshot; solo faltaba leerlo.
   */
  const fuentes = Object.entries(leadSummary.originCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, BARRAS_FUENTE.length)
    .map(([origen, cantidad]) => ({
      origen,
      cantidad,
      porcentaje: totalLeads > 0 ? Math.round((cantidad / totalLeads) * 100) : 0,
    }));

  const etapas = ETAPAS.map(({ clave, etiqueta }) => {
    const cantidad = leadSummary.statusCounts[clave] ?? 0;
    return {
      etiqueta,
      cantidad,
      porcentaje: totalLeads > 0 ? Math.round((cantidad / totalLeads) * 100) : 0,
    };
  });

  const tasaGlobal = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const mejorFuente = fuentes[0];

  /*
   * La campaña que mas trajo, si hay alguna.
   *
   * `campaignCounts` viene ordenado de mas a menos desde el RPC, asi que la
   * primera es la mejor. Solo trae leads de canal 'pb' -los que entraron por
   * un enlace de captura-, asi que en una cuenta que no hace publicidad la
   * lista viene vacia y este hallazgo no se pinta.
   */
  const mejorCampana = leadSummary.campaignCounts[0];
  const mejorMes = leadSummary.monthlyCounts.reduce<{ name: string; count: number } | null>(
    (mejor, mes) => (mejor === null || mes.count > mejor.count ? mes : mejor),
    null
  );

  const tasksTrend = calcularTendencia(taskSummary.completedToday, taskSummary.completedCompare, compareLabel);
  const sendTrend = calcularTendencia(sendSummary.today.total, sendSummary.compare.total, compareLabel);
  const leadsTrend = calcularTendencia(leadSummary.createdToday, leadSummary.createdCompare, compareLabel);

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      {/*
        LAS METAS DIARIAS SON UNA FUNCIONALIDAD DEL PLAN.

        Es lo unico del panel que hay que RELLENAR para que sirva -los tres
        objetivos se ponen en Ajustes-, y quien no las usa no las echa de
        menos. Hoy la tienen los tres planes, asi que la puerta no cambia nada;
        lo que permite es cobrarla.

        Envuelve solo la <Card>: el comentario de arriba es otro nodo JSX, y
        dos nodos dentro de un `&&` no compilan.
      */}
      {hasFeature('analisis.metas') && (
      <Card>
        {/*
          AQUI HABIA UNA ETIQUETA CON EL PERIODO ("vs ayer").

          Se quita porque lo dice el desplegable de la cabecera, que ademas es
          donde se cambia. Repetirlo en cada tarjeta era decir tres veces lo
          mismo en la misma pantalla, y ocupaba el hueco de la derecha del
          titulo en un panel de 500px.

          Es la segunda poda del mismo dato: primero estuvo pegado a CADA
          metrica dentro de `MetricCard` -~145px por tarjeta, sacaba la fila
          del panel-, luego paso aqui, y ahora vive solo en la cabecera. Por
          eso la cabecera se quedo pegada al desplazar: ya no hay una segunda
          copia que rescate el contexto cuando esta se va de la vista.
        */}
        <div className="card-header">
          <CardTitle as="h2">Progreso de metas (hoy)</CardTitle>
        </div>

        {/*
          Escalera de degradado de esta fila, de mas ancho a menos:
            >=580px  tres donas de 88px con la etiqueta del periodo
            >=500px  tres donas de 72px, sin etiqueta de periodo
            <500px   dos donas: "Llamar" se retira entera

          El orden importa: primero se comprime todo lo que se puede comprimir
          sin deformar, y solo cuando eso se agota cae la tercera tarjeta. Lo
          que no vuelve a pasar es que una dona quede partida contra el borde.

          "Llamar" es la que cae porque es la meta con menos volumen del
          producto; ensanchar el panel la devuelve.
        */}
        <div className="flex justify-between items-center divide-x divide-line min-w-0">
          <GoalRingCard
            icon={<Icon.WhatsAppOutline />}
            iconColor="text-primary-light"
            title="WhatsApp"
            current={waToday}
            target={settings.dailyGoalWhatsApp}
            unit="Mensajes"
            color={chartColors.primaryLight}
            tooltipText={`${waToday} de ${settings.dailyGoalWhatsApp} mensajes enviados hoy.`}
          />
          <GoalRingCard
            icon={<Icon.EmailOutline />}
            iconColor="text-primary"
            title="Email"
            current={emailToday}
            target={settings.dailyGoalEmail}
            unit="Correos"
            color={chartColors.primary}
            tooltipText={`${emailToday} de ${settings.dailyGoalEmail} correos enviados hoy.`}
          />
          <GoalRingCard
            icon={<Icon.PhoneOutline />}
            iconColor="text-[#CFC7FF]"
            title="Llamar"
            current={callToday}
            target={settings.dailyGoalCalls}
            unit="Llamadas"
            color={chartColors.primaryLight}
            tooltipText={`${callToday} de ${settings.dailyGoalCalls} llamadas registradas.`}
            className="hidden panel-lg:flex"
          />
        </div>
      </Card>
      )}

      {/* Conversión global */}
      <ConversionBar 
        total={totalLeads} 
        contacted={contacted} 
        converted={converted} 
        periodLabel="Hoy"
      />

      {/* Rendimiento hoy */}
      <Card className="mt-1">
        <div className="card-header">
          <CardTitle as="h2">Rendimiento · {nombreDePeriodo(periodo)}</CardTitle>
        </div>
        
        {/*
          Misma escalera que la fila de metas, y por el mismo motivo. El orden
          de las tres tarjetas se fijo el 2026-08-20 con la degradacion en
          mente: la que cae tiene que ser la ultima, porque `divide-x` pinta el
          separador a la izquierda de cada hijo y ocultar uno intermedio dejaria
          una linea suelta sin nada al lado.

            >=500px  las tres
            <500px   dos: "Tareas hechas" se retira entera
        */}
        <div className="flex justify-between items-center divide-x divide-line min-w-0">
          {/*
            Aqui habia una tarjeta "Respuestas" con el valor fijo en 0. No era un
            numero inventado, pero tampoco una medicion: el CRM no registra las
            respuestas de un lead en ninguna tabla, asi que ese cero no podia
            cambiar nunca. Se cambio por leads entrados, que si se mide y encaja
            en la misma lectura de "que paso hoy".
          */}
          <MetricCard
            icon={<Icon.LeadsOutline />}
            iconColor="text-ink"
            title="Leads nuevos"
            value={leadSummary.createdToday}
            trend={leadsTrend}
            onClick={() => onNavigate?.('leads')}
          />
          <MetricCard
            icon={<Icon.SendOutline />}
            iconColor="text-ink"
            title="Total envíos"
            value={sendSummary.today.total}
            trend={sendTrend}
            onClick={() => onNavigate?.('history')}
          />
          <MetricCard
            icon={<Icon.CheckOutline />}
            iconColor="text-ink"
            title="Tareas hechas"
            value={taskSummary.completedToday}
            trend={tasksTrend}
            onClick={() => onNavigate?.('tasks')}
            className="hidden panel-lg:flex"
          />
        </div>
      </Card>

      {/* Alerta olvidados */}
      {/* Alerta olvidados */}
      <div className="mt-1">
        {forgottenCount > 0 && (
          <AlertCard
            type="urgent"
            title="Alerta: olvidados"
            count={forgottenCount}
            description="Leads con más de 7 días sin contacto"
            onClick={() => {
              window.location.hash = '#leads?filter=olvidados';
              onNavigate?.('leads');
            }}
          />
        )}
      </div>

      {/* Panel inferior: 3 columnas cuando hay ancho, 2 cuando no.
          Con el rail de navegacion ocupando 48px, tres columnas mas dos
          separaciones de 16 dejaban 74px por tarjeta: no cabe ni el titulo. */}
      <div className="grid grid-cols-2 gap-2 mt-2 panel-sm:grid-cols-3 panel-sm:gap-4">
        {/*
          LOS TRES PIES DE ESTAS TARJETAS NO HACIAN NADA.

          "Ver todas", "Ver detalle" y "Ver todos": color de enlace, flecha, y
          ningun `onClick`. Lo llamativo es que el destino ya existia -este
          componente recibe `onNavigate` y lo usa mas arriba en las tarjetas de
          metricas-, asi que no faltaba nada por construir: faltaba cablearlos.

          De paso, el separador usaba `border-[#F0F2F5]`, un gris escrito a
          mano que no cambia con el tema. Pasa a `border-line`.
        */}
        {/* Fuentes principales */}
        <div className="bg-surface border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 whitespace-nowrap">Fuentes principales</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              {fuentes.length === 0 && <span className="text-ink-muted">Aun no hay leads.</span>}
              {fuentes.map((fuente, i) => (
                <div key={fuente.origen} className="flex items-center justify-between gap-1.5">
                  <span className="text-ink-secondary min-w-0 panel-md:w-14 truncate">
                    {ETIQUETAS_ORIGEN[fuente.origen] ?? fuente.origen}
                  </span>
                  {/* La barra es decoracion: repite en grafico el porcentaje que
                      ya esta escrito al lado. A 320px el `w-14` de la etiqueta
                      mas la barra dejaban "Man..." / "Formu...", asi que la
                      barra se retira y la etiqueta recupera su ancho. */}
                  <div className="hidden panel-md:block flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BARRAS_FUENTE[i] ?? 'bg-primary-soft'}`}
                      style={{ width: `${fuente.porcentaje}%` }}
                    ></div>
                  </div>
                  <span className="text-ink w-7 text-right">{fuente.porcentaje}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* Las fuentes son de donde vienen los leads, asi que el detalle esta en Leads. */}
          <button
            type="button"
            onClick={() => onNavigate?.('leads')}
            className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-line hover:underline transition-colors leading-none"
          >
            Ver todas
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Conversión por etapa */}
        <div className="bg-surface border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 leading-none">Conversión por etapa</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              {etapas.map((etapa) => (
                /* El `gap-1` evita que a 320px la etiqueta y la cifra se toquen
                   ("Contactado6"): `justify-between` reparte el sobrante, pero
                   cuando no sobra nada no deja separacion ninguna. */
                <div key={etapa.etiqueta} className="flex justify-between items-center gap-1">
                  <span className="text-ink-secondary truncate">{etapa.etiqueta}</span>
                  <div className="flex gap-1 shrink-0">
                    <span className="text-ink">{etapa.cantidad}</span>
                    {/* Truncar la etiqueta para salvar el porcentaje dejaba
                        "Con..." en dos filas distintas (Contactado y
                        Convertido): ilegible. Cae antes el porcentaje, que es
                        derivable de la cifra y del total. */}
                    <span className="hidden panel-md:inline text-ink-muted w-7 text-right">({etapa.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line mt-2 pt-2 flex justify-between items-center gap-1 leading-none">
              <span className="text-[10px] font-medium text-ink-secondary truncate">Tasa global</span>
              <span className="text-[12px] font-bold text-ink">{tasaGlobal}%</span>
            </div>
          </div>
          {/* La conversion por etapa es el embudo, y el embudo vive en Pipeline. */}
          <button
            type="button"
            onClick={() => onNavigate?.('pipeline')}
            className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-line hover:underline transition-colors leading-none"
          >
            Ver detalle
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Hallazgos */}
        <div className="bg-surface border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 leading-none">Hallazgos</h3>
            <ul className="flex flex-col gap-1.5 text-[10px] text-ink-secondary leading-none">
              {mejorFuente && (
                <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                  <strong className="text-ink font-medium">Mejor fuente: </strong>
                  {ETIQUETAS_ORIGEN[mejorFuente.origen] ?? mejorFuente.origen} ({mejorFuente.porcentaje}%).
                </li>
              )}
              {/*
                Se nombra el ENLACE y la campaña, no solo la campaña: una
                campaña puede tener varios enlaces -"PP: Ventas" y "PP:
                Retiros" dentro de "Videos Agosto 2026"- y saber cual de los
                dos funciono es el motivo de tenerlos separados.
              */}
              {mejorCampana && (
                <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                  <strong className="text-ink font-medium">Mejor campaña: </strong>
                  <span title={`${mejorCampana.enlace} · ${mejorCampana.campana}`}>
                    {mejorCampana.enlace} ({mejorCampana.leads}).
                  </span>
                </li>
              )}
              {mejorMes && mejorMes.count > 0 && (
                <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                  <strong className="text-ink font-medium">Mejor mes: </strong>
                  {mejorMes.name} ({mejorMes.count}).
                </li>
              )}
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                <strong className="text-ink font-medium">Contactados: </strong>
                {contacted} de {totalLeads}.
              </li>
            </ul>
          </div>
          {/* Los hallazgos apuntan a leads concretos. */}
          <button
            type="button"
            onClick={() => onNavigate?.('leads')}
            className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-line hover:underline transition-colors leading-none"
          >
            Ver todos
            <Icon.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
