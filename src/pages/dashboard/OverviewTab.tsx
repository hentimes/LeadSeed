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
import { calcularTendencia } from '../../components/dashboard/trend';

/** Como se llama cada origen en pantalla. */
const ETIQUETAS_ORIGEN: Record<string, string> = {
  manual: 'Manual',
  imported: 'Importado',
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
  onNavigate?: (page: Page) => void;
}

export default function OverviewTab({ snapshot, settings, compareLabel, onNavigate }: OverviewTabProps) {
  const { leadSummary, sendSummary, taskSummary } = snapshot;

  const waToday = sendSummary.today.whatsapp;
  const emailToday = sendSummary.today.email;
  const callToday = sendSummary.today.call;

  /**
   * Los anillos de metas pasaban `waToday - compare` con un `%` pegado detras,
   * asi que cinco mensajes mas que ayer se mostraban como "5%". Ahora es el
   * mismo calculo que el resto del panel.
   */
  const waTrend = calcularTendencia(waToday, sendSummary.compare.whatsapp, compareLabel);
  const emailTrend = calcularTendencia(emailToday, sendSummary.compare.email, compareLabel);
  const callTrend = calcularTendencia(callToday, sendSummary.compare.call, compareLabel);

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
  const mejorMes = leadSummary.monthlyCounts.reduce<{ name: string; count: number } | null>(
    (mejor, mes) => (mejor === null || mes.count > mejor.count ? mes : mejor),
    null
  );

  const tasksTrend = calcularTendencia(taskSummary.completedToday, taskSummary.completedCompare, compareLabel);
  const sendTrend = calcularTendencia(sendSummary.today.total, sendSummary.compare.total, compareLabel);
  const leadsTrend = calcularTendencia(leadSummary.createdToday, leadSummary.createdCompare, compareLabel);

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      {/* Progreso de metas */}
      <Card>
        <div className="card-header">
          <CardTitle as="h2">Progreso de metas (hoy)</CardTitle>
          <div className="text-[11px] font-medium text-ink-secondary bg-surface-muted px-3 py-1 rounded-[6px]">
            {compareLabel}
          </div>
        </div>

        <div className="flex justify-between items-center divide-x divide-line">
          <GoalRingCard
            icon={<Icon.WhatsAppOutline />}
            iconColor="text-primary-light"
            title="WhatsApp"
            current={waToday}
            target={settings.dailyGoalWhatsApp}
            unit="Mensajes"
            trend={waTrend}
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
            trend={emailTrend}
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
            trend={callTrend}
            color={chartColors.primaryLight}
            tooltipText={`${callToday} de ${settings.dailyGoalCalls} llamadas registradas.`}
          />
        </div>
      </Card>

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
          <CardTitle as="h2">Rendimiento hoy</CardTitle>
        </div>
        
        <div className="flex justify-between items-center divide-x divide-line">
          <MetricCard
            icon={<Icon.CheckOutline />}
            iconColor="text-ink"
            title="Tareas hechas"
            value={taskSummary.completedToday}
            trend={tasksTrend}
            onClick={() => onNavigate?.('tasks')}
          />
          <MetricCard
            icon={<Icon.SendOutline />}
            iconColor="text-ink"
            title="Total envíos"
            value={sendSummary.today.total}
            trend={sendTrend}
            onClick={() => onNavigate?.('history')}
          />
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

      {/* Panel inferior: 3 Columnas */}
      <div className="grid grid-cols-3 gap-4 mt-2">
        {/* Fuentes principales */}
        <div className="bg-surface border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 whitespace-nowrap">Fuentes principales</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              {fuentes.length === 0 && <span className="text-ink-muted">Aun no hay leads.</span>}
              {fuentes.map((fuente, i) => (
                <div key={fuente.origen} className="flex items-center justify-between gap-1.5">
                  <span className="text-ink-secondary w-14 truncate">
                    {ETIQUETAS_ORIGEN[fuente.origen] ?? fuente.origen}
                  </span>
                  <div className="flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
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
          <button className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-primary transition-colors leading-none">
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
                <div key={etapa.etiqueta} className="flex justify-between items-center">
                  <span className="text-ink-secondary">{etapa.etiqueta}</span>
                  <div className="flex gap-1">
                    <span className="text-ink">{etapa.cantidad}</span>
                    <span className="text-ink-muted w-7 text-right">({etapa.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line mt-2 pt-2 flex justify-between items-center leading-none">
              <span className="text-[10px] font-medium text-ink-secondary w-[60%]">Tasa global</span>
              <span className="text-[12px] font-bold text-ink">{tasaGlobal}%</span>
            </div>
          </div>
          <button className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-primary transition-colors leading-none">
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
          <button className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-primary transition-colors leading-none">
            Ver todos
            <Icon.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
