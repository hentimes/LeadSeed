import React from 'react';
import type { AppSettings, Page } from '../../types';
import type { DashboardSnapshot } from '../../services/dashboardService';
import GoalRingCard from '../../components/dashboard/GoalRingCard';
import ConversionBar from '../../components/dashboard/ConversionBar';
import MetricCard from '../../components/dashboard/MetricCard';
import AlertCard from '../../components/dashboard/AlertCard';
import { Icon } from '../../utils/icons';
import { chartColors } from '../../design/palette';

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

  const waDiff = waToday - sendSummary.compare.whatsapp;
  const emailDiff = emailToday - sendSummary.compare.email;
  const callDiff = callToday - sendSummary.compare.call;

  const totalLeads = leadSummary.total;
  const contacted = leadSummary.contacted;
  const converted = leadSummary.converted;
  const forgottenCount = leadSummary.forgotten;

  const calcTrend = (current: number, compare: number) => {
    if (compare === 0) return { value: '0%', label: 'vs ayer', isPositive: true };
    const diff = current - compare;
    const percent = Math.round((diff / compare) * 100);
    return { value: `${Math.abs(percent)}%`, label: 'vs ayer', isPositive: percent >= 0 };
  };

  const tasksTrend = calcTrend(taskSummary.completedToday, 0); // TODO: backend needs compare task data
  const sendTrend = calcTrend(sendSummary.today.total, sendSummary.compare.total);
  const repliesTrend = calcTrend(0, 0); // TODO: backend needs replies data

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      {/* Progreso de metas */}
      <div className="card-standard">
        <div className="card-header">
          <h2 className="card-title">Progreso de metas (hoy)</h2>
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
            trend={{ value: `${Math.abs(waDiff)}%`, isPositive: waDiff >= 0 }}
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
            trend={{ value: `${Math.abs(emailDiff)}%`, isPositive: emailDiff >= 0 }}
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
            trend={{ value: `${Math.abs(callDiff)}%`, isPositive: callDiff >= 0 }}
            color={chartColors.primaryLight}
            tooltipText={`${callToday} de ${settings.dailyGoalCalls} llamadas registradas.`}
          />
        </div>
      </div>

      {/* Conversión global */}
      <ConversionBar 
        total={totalLeads} 
        contacted={contacted} 
        converted={converted} 
        periodLabel="Hoy"
      />

      {/* Rendimiento hoy */}
      <div className="card-standard mt-1">
        <div className="card-header">
          <h2 className="card-title">Rendimiento hoy</h2>
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
          <MetricCard
            icon={<Icon.MessagesOutline />}
            iconColor="text-ink"
            title="Respuestas"
            value={0}
            trend={repliesTrend}
            onClick={() => onNavigate?.('chat')}
          />
        </div>
      </div>

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
        <div className="bg-white border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 whitespace-nowrap">Fuentes principales</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-ink-secondary w-14">Web</span>
                <div className="flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }}></div>
                </div>
                <span className="text-ink w-7 text-right">100%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-ink-secondary w-14">WhatsApp</span>
                <div className="flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary-light rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-ink w-7 text-right">0%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-ink-secondary w-14">LinkedIn</span>
                <div className="flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#CFC7FF] rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-ink w-7 text-right">0%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-ink-secondary w-14">Formulario</span>
                <div className="flex-1 h-1 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary-soft-strong rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-ink w-7 text-right">0%</span>
              </div>
            </div>
          </div>
          <button className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-primary transition-colors leading-none">
            Ver todas
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Conversión por etapa */}
        <div className="bg-white border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 leading-none">Conversión por etapa</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Nuevo</span>
                <div className="flex gap-1">
                  <span className="text-ink">592</span>
                  <span className="text-ink-muted w-7 text-right">(99%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Contactado</span>
                <div className="flex gap-1">
                  <span className="text-ink">2</span>
                  <span className="text-ink-muted w-7 text-right">(0%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Interesado</span>
                <div className="flex gap-1">
                  <span className="text-ink">2</span>
                  <span className="text-ink-muted w-7 text-right">(0%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Convertido</span>
                <div className="flex gap-1">
                  <span className="text-ink">0</span>
                  <span className="text-ink-muted w-7 text-right">(0%)</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-line mt-2 pt-2 flex justify-between items-center leading-none">
              <span className="text-[10px] font-medium text-ink-secondary w-[60%]">Tasa global</span>
              <span className="text-[12px] font-bold text-ink">0%</span>
            </div>
          </div>
          <button className="text-[10px] font-semibold text-primary flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-primary transition-colors leading-none">
            Ver detalle
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Hallazgos */}
        <div className="bg-white border border-line rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-ink mb-2 leading-none">Hallazgos</h3>
            <ul className="flex flex-col gap-1.5 text-[10px] text-ink-secondary leading-none">
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                <strong className="text-ink font-medium">Mejor fuente: </strong>
                Web (100%).
              </li>
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                <strong className="text-ink font-medium">Mejor mes: </strong>
                Julio (596).
              </li>
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-primary before:rounded-full">
                <strong className="text-ink font-medium">Tip: </strong>
                Optimiza Web.
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
