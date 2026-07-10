import { useEffect, useState } from 'react';
import { db } from '../db/database';
import type { Lead, Task } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalSent, setTotalSent] = useState(0);

  useEffect(() => {
    (async () => {
      const [l, t, totalLogs] = await Promise.all([
        db.leads.toArray(),
        db.tasks.toArray(),
        db.sendLog.count(),
      ]);
      setLeads(l);
      setTasks(t);
      setTotalSent(totalLogs);
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

  const thisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{leads.length}</p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400">Total leads</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
          <p className="text-lg font-bold text-green-700 dark:text-green-400">{thisMonth.length}</p>
          <p className="text-[10px] text-green-600 dark:text-green-400">Este mes</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
          <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{totalSent}</p>
          <p className="text-[10px] text-purple-600 dark:text-purple-400">Envíos</p>
        </div>
      </div>

      {/* Conversion & Tasks row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Tareas */}
        <div className="border rounded-lg p-3 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Tareas</p>
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const pending = tasks.filter((t) => t.status === 'pendiente');
            const overdue = pending.filter((t) => t.fechaVencimiento && t.fechaVencimiento.slice(0, 10) < today);
            const completed = tasks.filter((t) => t.status === 'completada');
            const rate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
            return (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">{overdue.length} vencidas</span>
                  <span className="text-green-600">{completed.length} completadas</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{pending.length} pendientes</span>
                  <span>{rate}% completado</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Conversión */}
        <div className="border rounded-lg p-3 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Conversión</p>
          {(() => {
            const converted = statusCounts['convertido'] || 0;
            const contacted = leads.filter((l) => (l.status || 'nuevo') !== 'nuevo').length;
            const contactRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;
            const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
            return (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">{contactRate}% contactados</span>
                  <span className="text-green-600">{conversionRate}% convertidos</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{contacted}/{leads.length}</span>
                  <span>{converted} leads</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-blue-500 h-full" style={{ width: `${contactRate}%` }} />
                  <div className="bg-green-500 h-full" style={{ width: `${conversionRate}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Pipeline */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Pipeline</h3>
        <div className="space-y-1">
          {(['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-xs w-20 text-gray-600">{STATUS_LABELS[s]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium"
                  style={{
                    width: leads.length ? `${Math.max(((statusCounts[s] || 0) / leads.length) * 100, 2)}%` : '0%',
                    backgroundColor: STATUS_COLORS[s],
                  }}
                >
                  {statusCounts[s] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      {/* Sin contactar */}
      {(() => {
        const neverContacted = leads.filter((l) => (l.status || 'nuevo') === 'nuevo' && l.phone);
        if (neverContacted.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Sin contactar aún</h3>
            <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20">
              <p className="text-xs text-orange-700 dark:text-orange-400">
                <span className="font-bold">{neverContacted.length}</span> leads nuevos sin primer contacto.
              </p>
              <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 max-h-20 overflow-y-auto">
                {neverContacted.slice(0, 10).map((l) => (
                  <span key={l.id} className="inline-block mr-2">{l.name}</span>
                ))}
                {neverContacted.length > 10 && <span>+{neverContacted.length - 10} más</span>}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Tareas</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className={`border rounded-lg p-3 ${overdueTasks.length ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <p className={`text-xl font-bold ${overdueTasks.length ? 'text-red-600' : 'text-gray-400'}`}>{overdueTasks.length}</p>
            <p className="text-xs text-gray-500">Vencidas</p>
          </div>
          <div className="border rounded-lg p-3 border-amber-200 bg-amber-50">
            <p className="text-xl font-bold text-amber-600">{todayTasks.length}</p>
            <p className="text-xs text-gray-500">Para hoy</p>
          </div>
        </div>
      </div>

      {/* Leads por mes */}
      {(() => {
        const months: { label: string; count: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            label: d.toLocaleDateString('es-CL', { month: 'short' }),
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
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Leads por mes</h3>
            <div className="flex items-end gap-1 h-20">
              {months.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-medium text-gray-600">{m.count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t min-h-[2px]"
                    style={{ height: `${Math.round((m.count / max) * 100)}%` }}
                  />
                  <span className="text-[10px] text-gray-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
