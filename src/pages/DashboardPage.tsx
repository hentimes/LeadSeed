import { useEffect, useState } from 'react';
import { db } from '../db/database';
import type { Lead, Task, SendLog } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { Icon } from '../utils/icons';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [recentLogs, setRecentLogs] = useState<SendLog[]>([]);

  useEffect(() => {
    (async () => {
      const [l, t, totalLogs, recent] = await Promise.all([
        db.leads.toArray(),
        db.tasks.toArray(),
        db.sendLog.count(),
        db.sendLog.orderBy('sentAt').reverse().limit(3).toArray(),
      ]);
      setLeads(l);
      setTasks(t);
      setTotalSent(totalLogs);
      setRecentLogs(recent);
    })();
  }, []);

  const statusCounts: Record<string, number> = {};
  for (const l of leads) {
    const s = l.status || 'nuevo';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const today = new Date().toISOString().slice(0, 10);
  const pendingTasks = tasks.filter((t) => t.status === 'pendiente');
  const overdueTasks = pendingTasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < today);
  const todayTasks = pendingTasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === today);

  const upcomingTasks = [...overdueTasks, ...todayTasks, ...pendingTasks.filter(t => !overdueTasks.includes(t) && !todayTasks.includes(t))].slice(0, 3);

  const thisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const neverContacted = leads.filter((l) => (l.status || 'nuevo') === 'nuevo' && l.phone);

  const getLeadName = (id?: number) => {
    if (!id) return 'Varios leads';
    const l = leads.find((x) => x.id === id);
    return l ? l.name : 'Desconocido';
  };

  return (
    <div className="max-w-4xl pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Resumen de actividad y atajos rápidos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.location.hash = '#leads'} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
            {Icon.Plus()} Nuevo Lead
          </button>
          <button onClick={() => window.location.hash = '#send'} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            ✉️ Nuevo Envío
          </button>
        </div>
      </div>

      {/* KPI Cards (Premium Colored) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-blue-700">Total Leads</p>
            <span className="text-blue-500 bg-blue-100 p-1.5 rounded-lg text-lg leading-none">👥</span>
          </div>
          <p className="text-3xl font-extrabold text-blue-800 tracking-tight">{leads.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-emerald-700">Nuevos este mes</p>
            <span className="text-emerald-500 bg-emerald-100 p-1.5 rounded-lg text-lg leading-none">📈</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-800 tracking-tight">{thisMonth.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-purple-700">Total Envíos</p>
            <span className="text-purple-500 bg-purple-100 p-1.5 rounded-lg text-lg leading-none">✉️</span>
          </div>
          <p className="text-3xl font-extrabold text-purple-800 tracking-tight">{totalSent}</p>
        </div>
      </div>

      {/* Agenda & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mini-Agenda */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Próximas Tareas</h3>
            <button onClick={() => window.location.hash = '#tasks'} className="text-blue-600 font-medium text-xs hover:text-blue-800">Ver todas →</button>
          </div>
          <div className="p-4 flex-1">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay tareas pendientes.</p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map(t => {
                  const isOverdue = t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < today;
                  const isToday = t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) === today;
                  return (
                    <div key={t.id} className="flex gap-3 items-start">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : isToday ? 'bg-amber-500' : 'bg-blue-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800 leading-tight">{t.titulo}</p>
                        <div className="flex gap-2 items-center mt-1">
                          {t.leadIds && t.leadIds.length > 0 && (
                            <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {getLeadName(t.leadIds[0])}
                            </span>
                          )}
                          <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-blue-600'}`}>
                            {t.fechaVencimiento ? new Date(t.fechaVencimiento).toLocaleDateString() : 'Sin fecha'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Actividad Reciente</h3>
            <span className="text-xs text-gray-500 font-medium">Últimos envíos</span>
          </div>
          <div className="p-4 flex-1">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay envíos registrados.</p>
            ) : (
              <div className="space-y-4">
                {recentLogs.map(log => {
                  const date = new Date(log.sentAt);
                  const isToday = date.toISOString().slice(0, 10) === today;
                  const timeString = isToday ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
                  return (
                    <div key={log.id} className="flex items-center gap-3">
                      <div className="bg-indigo-50 text-indigo-500 p-2 rounded-lg shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">Envío a {getLeadName(log.leadId)}</p>
                        <p className="text-xs text-gray-500">ID Plantilla: {log.templateId}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium shrink-0">{timeString}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion, Progress & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <div className="space-y-6">
          {/* Barras de Progreso */}
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Progreso y Conversión</h3>
            
            {/* Tareas Progress */}
            {(() => {
              const completed = tasks.filter((t) => t.status === 'completada').length;
              const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
              return (
                <div className="mb-5">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">Tareas Completadas</span>
                    <span className="text-sm font-bold text-gray-800">{rate}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{completed} de {tasks.length} tareas</p>
                </div>
              );
            })()}

            {/* Conversion Progress */}
            {(() => {
              const converted = statusCounts['convertido'] || 0;
              const contacted = leads.filter((l) => (l.status || 'nuevo') !== 'nuevo').length;
              const contactRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;
              const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
              return (
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">Tasa de Conversión</span>
                    <span className="text-sm font-bold text-gray-800">{conversionRate}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                    <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${contactRate}%` }} title={`Contactados: ${contactRate}%`} />
                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${conversionRate}%` }} title={`Convertidos: ${conversionRate}%`} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-[11px] text-blue-600 font-medium">Contactados: {contacted}</p>
                    <p className="text-[11px] text-indigo-600 font-medium">Convertidos: {converted}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sin contactar aún */}
          {neverContacted.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-800 mb-1">Sin contactar aún</h3>
                  <p className="text-xs text-amber-700 leading-relaxed mb-2">
                    Tienes <strong>{neverContacted.length} leads nuevos</strong> a los que no has contactado.
                  </p>
                  <div className="text-[11px] text-amber-600 bg-amber-100/50 p-2 rounded-lg max-h-24 overflow-y-auto">
                    {neverContacted.slice(0, 10).map((l) => (
                      <span key={l.id} className="inline-block mr-2 mb-1 bg-white/60 px-1.5 rounded">{l.name}</span>
                    ))}
                    {neverContacted.length > 10 && <span className="inline-block px-1.5 font-semibold">+{neverContacted.length - 10} más</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline & Months */}
        <div className="space-y-6">
          {/* Pipeline */}
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Embudo de Ventas (Pipeline)</h3>
            <div className="space-y-2.5">
              {(['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as const).map((s) => {
                const count = statusCounts[s] || 0;
                const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-600">{STATUS_LABELS[s]}</span>
                      <span className="text-gray-500 font-medium">{count} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: STATUS_COLORS[s] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leads por mes */}
          {(() => {
            const months: { label: string; count: number }[] = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              months.push({
                label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''),
                count: 0,
              });
            }
            for (const l of leads) {
              const d = new Date(l.createdAt);
              const idx = 5 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
              if (idx >= 0 && idx < 6) months[idx].count++;
            }
            const max = Math.max(1, ...months.map((m) => m.count));
            return (
              <div className="bg-white border rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Adquisición Mensual</h3>
                <div className="flex items-end justify-between gap-2 h-32 pt-4">
                  {months.map((m) => {
                    const heightPct = Math.round((m.count / max) * 100);
                    return (
                      <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                        <div
                          className="w-full max-w-[24px] bg-blue-100 group-hover:bg-blue-200 rounded-t-md relative transition-colors"
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        >
                          <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all" style={{ height: '100%', opacity: heightPct > 0 ? 1 : 0 }} />
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 capitalize">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
