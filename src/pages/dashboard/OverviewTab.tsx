import React from 'react';
import type { AppSettings, Page } from '../../types';
import type { DashboardSnapshot } from '../../services/dashboardService';
import GoalRingCard from '../../components/dashboard/GoalRingCard';
import ConversionBar from '../../components/dashboard/ConversionBar';
import MetricCard from '../../components/dashboard/MetricCard';
import AlertCard from '../../components/dashboard/AlertCard';
import { Icon } from '../../utils/icons';

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
          <div className="text-[11px] font-medium text-[#5B6475] bg-[#F7F8FB] px-3 py-1 rounded-[6px]">
            {compareLabel}
          </div>
        </div>

        <div className="flex justify-between items-center divide-x divide-[#E6EAF0]">
          <GoalRingCard
            icon={<Icon.WhatsAppOutline />}
            iconColor="text-[#8F85FF]"
            title="WhatsApp"
            current={waToday}
            target={settings.dailyGoalWhatsApp}
            unit="Mensajes"
            trend={{ value: `${Math.abs(waDiff)}%`, isPositive: waDiff >= 0 }}
            color="#8F85FF"
            tooltipText={`${waToday} de ${settings.dailyGoalWhatsApp} mensajes enviados hoy.`}
          />
          <GoalRingCard
            icon={<Icon.EmailOutline />}
            iconColor="text-[#635BFF]"
            title="Email"
            current={emailToday}
            target={settings.dailyGoalEmail}
            unit="Correos"
            trend={{ value: `${Math.abs(emailDiff)}%`, isPositive: emailDiff >= 0 }}
            color="#635BFF"
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
            color="#CFC7FF"
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
        
        <div className="flex justify-between items-center divide-x divide-[#E6EAF0]">
          <MetricCard
            icon={<Icon.CheckOutline />}
            iconColor="text-[#161A24]"
            title="Tareas hechas"
            value={taskSummary.completedToday}
            trend={tasksTrend}
            onClick={() => onNavigate?.('tasks')}
          />
          <MetricCard
            icon={<Icon.SendOutline />}
            iconColor="text-[#161A24]"
            title="Total envíos"
            value={sendSummary.today.total}
            trend={sendTrend}
            onClick={() => onNavigate?.('history')}
          />
          <MetricCard
            icon={<Icon.MessagesOutline />}
            iconColor="text-[#161A24]"
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
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-[#161A24] mb-2 whitespace-nowrap">Fuentes principales</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[#5B6475] w-14">Web</span>
                <div className="flex-1 h-1 bg-[#F7F8FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#635BFF] rounded-full" style={{ width: '100%' }}></div>
                </div>
                <span className="text-[#161A24] w-7 text-right">100%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[#5B6475] w-14">WhatsApp</span>
                <div className="flex-1 h-1 bg-[#F7F8FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#8F85FF] rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-[#161A24] w-7 text-right">0%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[#5B6475] w-14">LinkedIn</span>
                <div className="flex-1 h-1 bg-[#F7F8FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#CFC7FF] rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-[#161A24] w-7 text-right">0%</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[#5B6475] w-14">Formulario</span>
                <div className="flex-1 h-1 bg-[#F7F8FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E8E5FF] rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-[#161A24] w-7 text-right">0%</span>
              </div>
            </div>
          </div>
          <button className="text-[10px] font-semibold text-[#635BFF] flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-[#5B42F3] transition-colors leading-none">
            Ver todas
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Conversión por etapa */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-[#161A24] mb-2 leading-none">Conversión por etapa</h3>
            <div className="flex flex-col gap-1.5 text-[10px] font-medium leading-none">
              <div className="flex justify-between items-center">
                <span className="text-[#5B6475]">Nuevo</span>
                <div className="flex gap-1">
                  <span className="text-[#161A24]">592</span>
                  <span className="text-[#8C95A6] w-7 text-right">(99%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6475]">Contactado</span>
                <div className="flex gap-1">
                  <span className="text-[#161A24]">2</span>
                  <span className="text-[#8C95A6] w-7 text-right">(0%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6475]">Interesado</span>
                <div className="flex gap-1">
                  <span className="text-[#161A24]">2</span>
                  <span className="text-[#8C95A6] w-7 text-right">(0%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6475]">Convertido</span>
                <div className="flex gap-1">
                  <span className="text-[#161A24]">0</span>
                  <span className="text-[#8C95A6] w-7 text-right">(0%)</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-[#E6EAF0] mt-2 pt-2 flex justify-between items-center leading-none">
              <span className="text-[10px] font-medium text-[#5B6475] w-[60%]">Tasa global</span>
              <span className="text-[12px] font-bold text-[#161A24]">0%</span>
            </div>
          </div>
          <button className="text-[10px] font-semibold text-[#635BFF] flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-[#5B42F3] transition-colors leading-none">
            Ver detalle
            <Icon.ArrowRight />
          </button>
        </div>

        {/* Hallazgos */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-2 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-[#161A24] mb-2 leading-none">Hallazgos</h3>
            <ul className="flex flex-col gap-1.5 text-[10px] text-[#5B6475] leading-none">
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-[#635BFF] before:rounded-full">
                <strong className="text-[#161A24] font-medium">Mejor fuente: </strong>
                Web (100%).
              </li>
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-[#635BFF] before:rounded-full">
                <strong className="text-[#161A24] font-medium">Mejor mes: </strong>
                Julio (596).
              </li>
              <li className="relative pl-2.5 before:content-[''] before:absolute before:left-0 before:top-1 before:w-1 before:h-1 before:bg-[#635BFF] before:rounded-full">
                <strong className="text-[#161A24] font-medium">Tip: </strong>
                Optimiza Web.
              </li>
            </ul>
          </div>
          <button className="text-[10px] font-semibold text-[#635BFF] flex items-center justify-between w-full mt-2 pt-2 border-t border-[#F0F2F5] hover:text-[#5B42F3] transition-colors leading-none">
            Ver todos
            <Icon.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
