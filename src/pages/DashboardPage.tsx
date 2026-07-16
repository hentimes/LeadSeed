import { useEffect, useState } from 'react';
import { getSettings } from '../db/database';
import { supabase } from '../lib/supabaseClient';
import { useLeads } from '../hooks/useLeads';
import { useAuth } from '../contexts/AuthContext';
import type { Lead, Task, SendLog, AppSettings, Page } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { Icon } from '../utils/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

function getDaysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type Tab = 'overview' | 'pipeline' | 'tasks';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 text-white text-[11px] px-3 py-2 shadow-xl border-none pointer-events-none">
        {label && <p className="font-bold mb-1 text-gray-300 uppercase tracking-wide">{label}</p>}
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLogs, setAllLogs] = useState<SendLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const { user } = useAuth();
  const { getAll: getLeads } = useLeads();

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      const [ { data: logsData }, s ] = await Promise.all([
        supabase.from('send_logs').select('*').eq('user_id', userId),
        getSettings()
      ]);
      
      const logs = (logsData || []).map(l => ({
        id: l.id,
        templateId: l.template_id,
        templateType: l.template_type,
        leadId: l.lead_id,
        leadName: l.lead_name,
        leadPhone: l.lead_phone,
        sentAt: l.sent_at,
        scheduledFor: l.scheduled_for
      }));
      
      let fetchedLeads: Lead[] = [];
      let fetchedTasks: Task[] = [];
      
      if (user) {
        fetchedLeads = await getLeads();
        
        const { data: dbTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
          
        fetchedTasks = (dbTasks || []).map(t => ({
          id: t.id,
          titulo: t.title,
          descripcion: t.description || '',
          status: t.status as 'pendiente' | 'completada',
          fechaVencimiento: t.due_date || '',
          leadIds: t.lead_id ? [t.lead_id] : [],
          leadListIds: t.lead_list_ids || [],
          createdAt: t.created_at
        }));
      }

      setLeads(fetchedLeads);
      setTasks(fetchedTasks);
      setAllLogs(logs);
      setSettings(s);
    })();
  }, [user, getLeads]);

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

  // Datos para Gráficos
  const pipelineData = (['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as const).map((s) => ({
    name: STATUS_LABELS[s],
    Leads: statusCounts[s] || 0,
    fill: STATUS_COLORS[s]
  }));

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
  const monthlyData = months.map(m => ({ name: m.label.toUpperCase(), Adquisición: m.count }));

  const createDonutData = (current: number, target: number, color: string) => [
    { name: 'Logrado', value: Math.min(current, target), color },
    { name: 'Faltante', value: Math.max(0, target - current), color: '#e5e7eb' }
  ];

  return (
    <div className="w-full pb-6 px-1 flex flex-col">
      {/* Header y Botones Superiores */}
      <div className="flex justify-between items-center shrink-0 mb-4">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 tracking-tight flex items-center gap-2">
          <Icon.Dashboard /> Panel Analítico
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { window.location.hash = '#leads?action=new'; if (onNavigate) onNavigate('leads'); }} className="bg-slate-100 dark:bg-slate-800 hover:bg-gray-200 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-slate-600/50">
            <Icon.Plus /> Lead
          </button>
          <button onClick={() => { if (onNavigate) onNavigate('send'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-none text-xs font-semibold transition-colors flex items-center gap-1.5 border border-blue-700">
            <Icon.Send /> Envío
          </button>
        </div>
      </div>

      {/* Tabs - Header Style */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/50 mb-5 gap-6">
        <button
          onClick={() => setTab('overview')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'overview' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.ChartPie /> Overview
        </button>
        <button
          onClick={() => setTab('pipeline')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'pipeline' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Icon.Pipeline /> Pipeline
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`pb-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
            tab === 'tasks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
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
            <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
              <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Progreso de Metas (Hoy)</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{compareLabel}</span>
              </h3>
              <div className="grid grid-cols-3 gap-1">
                
                {/* Meta WhatsApp */}
                <div className="flex flex-col items-center group hover:bg-slate-50 dark:bg-slate-900 transition-colors py-2 px-1 rounded">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Icon.Messages /> WA</div>
                  <div className="w-24 h-24 relative mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={createDonutData(waToday, settings.dailyGoalWhatsApp, '#059669')} dataKey="value" innerRadius="75%" outerRadius="100%" stroke="none" startAngle={90} endAngle={-270}>
                          {createDonutData(waToday, settings.dailyGoalWhatsApp, '#059669').map((e, idx) => <Cell key={idx} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{waPct}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none">{waToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalWhatsApp}</span>
                    </div>
                    <span className={`text-[8px] font-bold mt-1 ${waDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {waDiff >= 0 ? '+' : ''}{waDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>

                {/* Meta Email */}
                <div className="flex flex-col items-center group hover:bg-slate-50 dark:bg-slate-900 transition-colors py-2 px-1 rounded">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Icon.Email /> Email</div>
                  <div className="w-24 h-24 relative mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={createDonutData(emailToday, settings.dailyGoalEmail, '#2563eb')} dataKey="value" innerRadius="75%" outerRadius="100%" stroke="none" startAngle={90} endAngle={-270}>
                          {createDonutData(emailToday, settings.dailyGoalEmail, '#2563eb').map((e, idx) => <Cell key={idx} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{emailPct}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none">{emailToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalEmail}</span>
                    </div>
                    <span className={`text-[8px] font-bold mt-1 ${emailDiff >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {emailDiff >= 0 ? '+' : ''}{emailDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>

                {/* Meta Llamadas */}
                <div className="flex flex-col items-center group hover:bg-slate-50 dark:bg-slate-900 transition-colors py-2 px-1 rounded">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Icon.Phone /> Llamar</div>
                  <div className="w-24 h-24 relative mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={createDonutData(callToday, settings.dailyGoalCalls, '#4b5563')} dataKey="value" innerRadius="75%" outerRadius="100%" stroke="none" startAngle={90} endAngle={-270}>
                          {createDonutData(callToday, settings.dailyGoalCalls, '#4b5563').map((e, idx) => <Cell key={idx} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{callPct}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none">{callToday}</span>
                      <span className="text-[9px] text-gray-400 font-medium">/ {settings.dailyGoalCalls}</span>
                    </div>
                    <span className={`text-[8px] font-bold mt-1 ${callDiff >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-red-500'}`}>
                      {callDiff >= 0 ? '+' : ''}{callDiff} vs {compareLabel.split(' ')[1]}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Conversión y Tareas de Hoy (Overview) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
                <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">Conversión Global</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-blue-600">{contactRate}% Contactados</span>
                    <span className="text-green-600">{conversionRate}% Convertidos</span>
                  </div>
                  <div className="bg-gray-200 h-1 overflow-hidden flex">
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${contactRate}%` }} />
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${conversionRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">
                    <span>{contacted} de {leads.length} leads</span>
                    <span>{converted} leads</span>
                  </div>
                </div>
              </div>
              <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
                <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">Rendimiento Hoy</h3>
                <div className="flex justify-around items-center h-full pb-2">
                  <div className="text-center group cursor-default">
                    <p className="text-2xl font-black text-emerald-600 group-hover:scale-110 transition-transform">{completedToday}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1">Tareas Hechas</p>
                  </div>
                  <div className="text-center group cursor-default">
                    <p className="text-2xl font-black text-blue-600 group-hover:scale-110 transition-transform">{logsToday.length}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1">Total Envíos</p>
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
            <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Embudo de Ventas</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }} />
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

            <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Adquisición Mensual</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAdq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Adquisición" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAdq)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAREAS ======================= */}
        {tab === 'tasks' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
                <h3 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-3">Vencidas / Urgentes</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-red-600">{overdueTasks.length}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tienes tareas que ya superaron su fecha límite. Revisa la pestaña de tareas.</div>
                </div>
              </div>
              <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
                <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-3">Para Hoy</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-amber-500">{todayTasks.length}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tareas programadas para ser completadas el día de hoy.</div>
                </div>
              </div>
            </div>

            <div className="bg-transparent border-t border-b border-slate-200 dark:border-slate-700/50 py-3">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">Eficiencia Histórica</h3>
              {(() => {
                const completed = tasks.filter((t) => t.status === 'completada').length;
                const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completadas</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{rate}%</span>
                    </div>
                    <div className="bg-gray-200 h-1 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${rate}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">{completed} DE {tasks.length} TAREAS</p>
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
