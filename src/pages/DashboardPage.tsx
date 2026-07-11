import { useEffect, useState } from 'react';
import { db, getSettings } from '../db/database';
import type { Lead, Task, SendLog, AppSettings, ComparePeriod, Page } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { Icon } from '../utils/icons';

function getDaysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type Tab = 'overview' | 'pipeline' | 'tasks';

export default function DashboardPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLogs, setAllLogs] = useState<SendLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    (async () => {
      const [l, t, logs, s] = await Promise.all([
        db.leads.toArray(),
        db.tasks.toArray(),
        db.sendLog.toArray(),
        getSettings()
      ]);
      setLeads(l);
      setTasks(t);
      setAllLogs(logs);
      setSettings(s);
    })();
  }, []);

  if (!settings) return null;

  const todayStr = getDaysAgoStr(0);
  let compareStr = getDaysAgoStr(1);
  let compareLabel = 'vs ayer';
  
  if (settings.dashboardComparePeriod === 'lastWeek') {
    compareStr = getDaysAgoStr(7);
    compareLabel = 'vs sem. pasada';
  } else if (settings.dashboardComparePeriod === 'lastMonth') {
    compareStr = getDaysAgoStr(30);
    compareLabel = 'vs mes pasado';
  } else if (settings.dashboardComparePeriod === 'lastYear') {
    compareStr = getDaysAgoStr(365);
    compareLabel = 'vs año pasado';
  }

  // Daily Tracker Stats
  const logsToday = allLogs.filter(l => l.sentAt.startsWith(todayStr));
  const logsCompare = allLogs.filter(l => l.sentAt.startsWith(compareStr));

  const waToday = logsToday.filter(l => l.templateType === 'whatsapp').length;
  const emailToday = logsToday.filter(l => l.templateType === 'email').length;
  const callToday = logsToday.filter(l => l.templateType === 'call').length;

  const waDiff = waToday - logsCompare.filter(l => l.templateType === 'whatsapp').length;
  const emailDiff = emailToday - logsCompare.filter(l => l.templateType === 'email').length;
  const callDiff = callToday - logsCompare.filter(l => l.templateType === 'call').length;

  const waPct = Math.min(100, Math.round((waToday / (settings.dailyGoalWhatsApp || 1)) * 100));
  const emailPct = Math.min(100, Math.round((emailToday / (settings.dailyGoalEmail || 1)) * 100));
  const callPct = Math.min(100, Math.round((callToday / (settings.dailyGoalCalls || 1)) * 100));

  // Tareas Stats
  const pendingTasks = tasks.filter((t) => t.status === 'pendiente');
  const completedToday = tasks.filter((t) => t.status === 'completada' && t.createdAt.startsWith(todayStr)).length;
  const overdueTasks = pendingTasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < todayStr);
  const todayTasks = pendingTasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === todayStr);

  // Status/Pipeline Stats
  const statusCounts: Record<string, number> = {};
  for (const l of leads) {
    const s = l.status || 'nuevo';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  // Olvidados (creado hace > 7 días, sin ningún sendLog)
  const neverContacted = leads.filter(l => {
    const daysSince = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 3600 * 24));
    if (daysSince <= 7) return false;
    return !allLogs.some(log => log.leadId === l.id);
  });

  const converted = statusCounts['convertido'] || 0;
  const contacted = leads.filter((l) => (l.status || 'nuevo') !== 'nuevo').length;
  const contactRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;
  const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;

  return (
    <div className="w-full pb-6 px-1 flex flex-col">
      {/* Header y Botones Superiores */}
      <div className="flex justify-between items-center shrink-0 mb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Icon.Dashboard /> Panel Analítico
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { window.location.hash = '#leads?action=new'; if (onNavigate) onNavigate('leads'); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5">
            <Icon.Plus /> Lead
          </button>
          <button onClick={() => { if (onNavigate) onNavigate('send'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5">
            <Icon.Send /> Envío
          </button>
        </div>
      </div>

      {/* Tabs - Header Style */}
      <div className="flex border-b border-gray-200 mb-5 gap-6">
        <button
          onClick={() => setTab('overview')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'overview' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon.ChartPie /> Overview
        </button>
        <button
          onClick={() => setTab('pipeline')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'pipeline' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon.Pipeline /> Pipeline
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'tasks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon.Tasks /> Tareas
        </button>
      </div>

      <div className="animate-fade-in">
        {/* ======================= OVERVIEW ======================= */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            
            {/* Metas Diarias */}
            <div className="bg-transparent border-t border-b border-gray-200 py-2">
              <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Progreso de Metas (Hoy)</span>
                <span className="text-[9px] text-gray-500 font-medium">{compareLabel}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col group hover:bg-gray-50 transition-colors p-1.5 -mx-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wide flex items-center gap-1"><Icon.Messages /> WhatsApp</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-800 leading-none">{waToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalWhatsApp}</span>
                      <span className={`ml-1 text-[9px] font-bold ${waDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {waDiff >= 0 ? '+' : ''}{waDiff}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 h-1 overflow-hidden">
                    <div className="bg-gray-800 h-full transition-all" style={{ width: `${waPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-col group hover:bg-gray-50 transition-colors p-1.5 -mx-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wide flex items-center gap-1"><Icon.Email /> Emails</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-800 leading-none">{emailToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalEmail}</span>
                      <span className={`ml-1 text-[9px] font-bold ${emailDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {emailDiff >= 0 ? '+' : ''}{emailDiff}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 h-1 overflow-hidden">
                    <div className="bg-gray-800 h-full transition-all" style={{ width: `${emailPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-col group hover:bg-gray-50 transition-colors p-1.5 -mx-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wide flex items-center gap-1"><Icon.Phone /> Llamadas</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-800 leading-none">{callToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalCalls}</span>
                      <span className={`ml-1 text-[9px] font-bold ${callDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {callDiff >= 0 ? '+' : ''}{callDiff}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 h-1 overflow-hidden">
                    <div className="bg-gray-800 h-full transition-all" style={{ width: `${callPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Conversión y Tareas de Hoy (Overview) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-transparent border-t border-b border-gray-200 py-3">
                <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">Conversión Global</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-blue-600">{contactRate}% Contactados</span>
                    <span className="text-green-600">{conversionRate}% Convertidos</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${contactRate}%` }} />
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${conversionRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                    <span>{contacted} de {leads.length} leads</span>
                    <span>{converted} leads</span>
                  </div>
                </div>
              </div>
              <div className="bg-transparent border-t border-b border-gray-200 py-3">
                <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">Rendimiento Hoy</h3>
                <div className="flex justify-around items-center h-full pb-2">
                  <div className="text-center group cursor-default">
                    <p className="text-2xl font-black text-emerald-600 group-hover:scale-110 transition-transform">{completedToday}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Tareas Hechas</p>
                  </div>
                  <div className="text-center group cursor-default">
                    <p className="text-2xl font-black text-blue-600 group-hover:scale-110 transition-transform">{logsToday.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Total Envíos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Olvidados Widget */}
            {neverContacted.length > 0 && (
              <button 
                onClick={() => { window.location.hash = '#leads?filter=olvidados'; if (onNavigate) onNavigate('leads'); }}
                className="w-full bg-transparent border-t border-b border-red-200 hover:bg-red-50 py-3 px-2 flex items-center justify-between transition-colors text-left group mt-2"
              >
                <div>
                  <h3 className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5 group-hover:scale-105 transition-transform origin-left">
                    <Icon.Warning /> Alerta: Olvidados ({neverContacted.length})
                  </h3>
                  <p className="text-[10px] text-red-600 mt-1">Leads con más de 7 días sin contacto.</p>
                </div>
                <span className="text-red-500 font-bold text-lg transition-transform group-hover:translate-x-1"><Icon.ChevronRight /></span>
              </button>
            )}
          </div>
        )}

        {/* ======================= PIPELINE ======================= */}
        {tab === 'pipeline' && (
          <div className="flex flex-col gap-6">
            <div className="bg-transparent border-t border-b border-gray-200 py-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-4">Embudo de Ventas</h3>
              <div className="space-y-4">
                {(['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as const).map((s) => {
                  const count = statusCounts[s] || 0;
                  const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={s} className="group">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">{STATUS_LABELS[s]}</span>
                        <span className="text-gray-500 font-bold text-[11px]">{count} <span className="font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 overflow-hidden relative">
                        <div
                          className="h-full transition-all duration-500 absolute left-0"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: STATUS_COLORS[s] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-transparent border-t border-b border-gray-200 py-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-4">Adquisición Mensual</h3>
              {(() => {
                const months: { label: string; count: number }[] = [];
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  months.push({ label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), count: 0 });
                }
                for (const l of leads) {
                  const d = new Date(l.createdAt);
                  const idx = 5 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
                  if (idx >= 0 && idx < 6) months[idx].count++;
                }
                const max = Math.max(1, ...months.map((m) => m.count));
                return (
                  <div className="flex items-end justify-between gap-2 h-32 pt-4">
                    {months.map((m) => {
                      const heightPct = Math.round((m.count / max) * 100);
                      return (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                          <div
                            className="w-full max-w-[32px] bg-gray-200 group-hover:bg-gray-300 relative transition-colors"
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                          >
                            <div className="absolute bottom-0 w-full bg-blue-600 transition-all" style={{ height: '100%', opacity: heightPct > 0 ? 1 : 0 }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 capitalize tracking-wider">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ======================= TAREAS ======================= */}
        {tab === 'tasks' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-transparent border-t border-b border-gray-200 py-3">
                <h3 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-3">Vencidas / Urgentes</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-red-600">{overdueTasks.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Tienes tareas que ya superaron su fecha límite. Revisa la pestaña de tareas.</div>
                </div>
              </div>
              <div className="bg-transparent border-t border-b border-gray-200 py-3">
                <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-3">Para Hoy</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-amber-500">{todayTasks.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Tareas programadas para ser completadas el día de hoy.</div>
                </div>
              </div>
            </div>

            <div className="bg-transparent border-t border-b border-gray-200 py-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-4">Eficiencia Histórica</h3>
              {(() => {
                const completed = tasks.filter((t) => t.status === 'completada').length;
                const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-semibold text-gray-600">Completadas</span>
                      <span className="text-sm font-bold text-gray-800">{rate}%</span>
                    </div>
                    <div className="bg-gray-200 h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${rate}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 tracking-wide uppercase">{completed} DE {tasks.length} TAREAS</p>
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
