import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getSettings } from '../db/database';
import { fetchDashboardSnapshot, type DashboardSnapshot } from '../services/dashboardService';
import type { AppSettings, Page } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';
import { Icon } from '../utils/icons';

type Tab = 'overview' | 'pipeline' | 'tasks';

function getGoalProgress(current: number, target: number) {
  if (target <= 0) {
    return {
      percent: 0,
      achieved: 0,
      remaining: 0,
      hasTarget: false,
    };
  }

  return {
    percent: Math.min(100, Math.round((current / target) * 100)),
    achieved: Math.min(current, target),
    remaining: Math.max(0, target - current),
    hasTarget: true,
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border-none bg-gray-800 px-3 py-2 text-[11px] text-white shadow-xl pointer-events-none">
        {label && <p className="mb-1 font-bold uppercase tracking-wide text-gray-300">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="flex items-center gap-2 font-medium">
            {entry.name && <span className="opacity-75">{entry.name}:</span>}
            <span style={{ color: entry.color || entry.payload?.fill || '#fff' }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default function DashboardPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const nextSettings = await getSettings();
      if (cancelled) {
        return;
      }

      setSettings(nextSettings);

      if (!user) {
        setSnapshot(null);
        return;
      }

      const nextSnapshot = await fetchDashboardSnapshot(nextSettings.dashboardComparePeriod);
      if (!cancelled) {
        setSnapshot(nextSnapshot);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!settings || !snapshot) {
    return null;
  }

  let compareLabel = 'vs ayer';
  if (settings.dashboardComparePeriod === 'lastWeek') {
    compareLabel = 'vs sem. pasada';
  } else if (settings.dashboardComparePeriod === 'lastMonth') {
    compareLabel = 'vs mes pasado';
  } else if (settings.dashboardComparePeriod === 'lastYear') {
    compareLabel = 'vs año pasado';
  }

  const { leadSummary, sendSummary, taskSummary } = snapshot;

  const waToday = sendSummary.today.whatsapp;
  const emailToday = sendSummary.today.email;
  const callToday = sendSummary.today.call;

  const waDiff = waToday - sendSummary.compare.whatsapp;
  const emailDiff = emailToday - sendSummary.compare.email;
  const callDiff = callToday - sendSummary.compare.call;

  const waProgress = getGoalProgress(waToday, settings.dailyGoalWhatsApp);
  const emailProgress = getGoalProgress(emailToday, settings.dailyGoalEmail);
  const callProgress = getGoalProgress(callToday, settings.dailyGoalCalls);

  const totalLeads = leadSummary.total;
  const contacted = leadSummary.contacted;
  const converted = leadSummary.converted;
  const forgottenCount = leadSummary.forgotten;
  const contactRate = totalLeads ? Math.round((contacted / totalLeads) * 100) : 0;
  const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0;

  const pipelineData = (['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as const).map((status) => ({
    name: STATUS_LABELS[status],
    Leads: leadSummary.statusCounts[status] || 0,
    fill: STATUS_COLORS[status],
  }));

  const monthlyData = leadSummary.monthlyCounts.map((month) => ({
    name: month.name,
    Adquisicion: month.count,
  }));

  const createDonutData = (
    current: number,
    target: number,
    color: string
  ) => {
    const progress = getGoalProgress(current, target);
    if (!progress.hasTarget) {
      return [
        { name: 'Sin meta', value: 1, color: '#e5e7eb' },
      ];
    }

    return [
      { name: 'Logrado', value: progress.achieved, color },
      { name: 'Faltante', value: progress.remaining, color: '#e5e7eb' },
    ];
  };

  return (
    <div className="flex w-full flex-col px-1 pb-6">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-700 dark:text-slate-200">
          <Icon.Dashboard /> Panel Analítico
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              window.location.hash = '#leads?action=new';
              onNavigate?.('leads');
            }}
            className="flex items-center gap-1.5 rounded-none border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-gray-200 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-300"
          >
            <Icon.Plus /> Lead
          </button>
          <button
            onClick={() => {
              onNavigate?.('send');
            }}
            className="flex items-center gap-1.5 rounded-none border border-blue-700 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Icon.Send /> Envío
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-6 border-b border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setTab('overview')}
          className={`-mb-[1px] flex items-center gap-2 border-b-2 pb-2 text-[13px] font-semibold transition-all ${
            tab === 'overview'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200'
          }`}
        >
          <Icon.ChartPie /> Overview
        </button>
        <button
          onClick={() => setTab('pipeline')}
          className={`-mb-[1px] flex items-center gap-2 border-b-2 pb-2 text-[13px] font-semibold transition-all ${
            tab === 'pipeline'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200'
          }`}
        >
          <Icon.Pipeline /> Pipeline
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`-mb-[1px] flex items-center gap-2 border-b-2 pb-2 text-[13px] font-semibold transition-all ${
            tab === 'tasks'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200'
          }`}
        >
          <Icon.Tasks /> Tareas
        </button>
      </div>

      <div className="animate-fade-in">
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
              <h3 className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <span>Progreso de Metas (Hoy)</span>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{compareLabel}</span>
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <div className="group flex flex-col items-center rounded px-1 py-2 transition-colors hover:bg-slate-50 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Icon.Messages /> WA
                  </div>
                  <div className="relative mb-2 h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={createDonutData(waToday, settings.dailyGoalWhatsApp, '#059669')}
                          dataKey="value"
                          innerRadius="75%"
                          outerRadius="100%"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {createDonutData(waToday, settings.dailyGoalWhatsApp, '#059669').map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {waProgress.hasTarget ? `${waProgress.percent}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black leading-none text-slate-700 dark:text-slate-200">{waToday}</span>
                      <span className="text-[9px] font-medium text-gray-400">
                        / {waProgress.hasTarget ? settings.dailyGoalWhatsApp : 'sin meta'}
                      </span>
                    </div>
                    <span className={`mt-1 text-[8px] font-bold ${waDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {waDiff >= 0 ? '+' : ''}
                      {waDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>

                <div className="group flex flex-col items-center rounded px-1 py-2 transition-colors hover:bg-slate-50 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Icon.Email /> Email
                  </div>
                  <div className="relative mb-2 h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={createDonutData(emailToday, settings.dailyGoalEmail, '#2563eb')}
                          dataKey="value"
                          innerRadius="75%"
                          outerRadius="100%"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {createDonutData(emailToday, settings.dailyGoalEmail, '#2563eb').map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {emailProgress.hasTarget ? `${emailProgress.percent}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black leading-none text-slate-700 dark:text-slate-200">{emailToday}</span>
                      <span className="text-[9px] font-medium text-gray-400">
                        / {emailProgress.hasTarget ? settings.dailyGoalEmail : 'sin meta'}
                      </span>
                    </div>
                    <span className={`mt-1 text-[8px] font-bold ${emailDiff >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {emailDiff >= 0 ? '+' : ''}
                      {emailDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>

                <div className="group flex flex-col items-center rounded px-1 py-2 transition-colors hover:bg-slate-50 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Icon.Phone /> Llamar
                  </div>
                  <div className="relative mb-2 h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={createDonutData(callToday, settings.dailyGoalCalls, '#4b5563')}
                          dataKey="value"
                          innerRadius="75%"
                          outerRadius="100%"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {createDonutData(callToday, settings.dailyGoalCalls, '#4b5563').map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {callProgress.hasTarget ? `${callProgress.percent}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black leading-none text-slate-700 dark:text-slate-200">{callToday}</span>
                      <span className="text-[9px] font-medium text-gray-400">
                        / {callProgress.hasTarget ? settings.dailyGoalCalls : 'sin meta'}
                      </span>
                    </div>
                    <span className={`mt-1 text-[8px] font-bold ${callDiff >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-red-500'}`}>
                      {callDiff >= 0 ? '+' : ''}
                      {callDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Conversión Global</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-blue-600">{contactRate}% Contactados</span>
                    <span className="text-green-600">{conversionRate}% Convertidos</span>
                  </div>
                  <div className="flex h-1 overflow-hidden bg-gray-200">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${contactRate}%` }} />
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${conversionRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <span>{contacted} de {totalLeads} leads</span>
                    <span>{converted} leads</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Rendimiento Hoy</h3>
                <div className="flex h-full items-center justify-around pb-2">
                  <div className="group cursor-default text-center">
                    <p className="text-2xl font-black text-emerald-600 transition-transform group-hover:scale-110">{taskSummary.completedToday}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Tareas Hechas</p>
                  </div>
                  <div className="group cursor-default text-center">
                    <p className="text-2xl font-black text-blue-600 transition-transform group-hover:scale-110">{sendSummary.today.total}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Total Envíos</p>
                  </div>
                </div>
              </div>
            </div>

            {forgottenCount > 0 && (
              <button
                onClick={() => {
                  window.location.hash = '#leads?filter=olvidados';
                  onNavigate?.('leads');
                }}
                className="group mt-2 flex w-full items-center justify-between border-t border-b border-red-200 bg-transparent px-2 py-3 text-left transition-colors hover:bg-red-50"
              >
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-800 transition-transform origin-left group-hover:scale-105">
                    <Icon.Warning /> Alerta: Olvidados ({forgottenCount})
                  </h3>
                  <p className="mt-1 text-[10px] text-red-600">Leads con más de 7 días sin contacto.</p>
                </div>
                <span className="text-lg font-bold text-red-500 transition-transform group-hover:translate-x-1">
                  <Icon.ChevronRight />
                </span>
              </button>
            )}
          </div>
        )}

        {tab === 'pipeline' && (
          <div className="flex flex-col gap-6">
            <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Embudo de Ventas</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="Leads" fill="#3b82f6" radius={0}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Adquisición Mensual</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAdq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Adquisicion" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAdq)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-red-700">Vencidas / Urgentes</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-red-600">{taskSummary.overdue}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tienes tareas que ya superaron su fecha límite. Revisa la pestaña de tareas.</div>
                </div>
              </div>
              <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-amber-600">Para Hoy</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-amber-500">{taskSummary.today}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tareas programadas para ser completadas el día de hoy.</div>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 bg-transparent py-3 dark:border-slate-700/50">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Eficiencia Histórica</h3>
              {(() => {
                const completed = taskSummary.completedTotal;
                const rate = taskSummary.total ? Math.round((completed / taskSummary.total) * 100) : 0;
                return (
                  <div className="space-y-3">
                    <div className="mb-1 flex items-end justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completadas</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{rate}%</span>
                    </div>
                    <div className="h-1 overflow-hidden bg-gray-200">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${rate}%` }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{completed} DE {taskSummary.total} TAREAS</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
