import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSettings, saveSettings } from '../services/appSettingsService';
import { asegurarTareaDiariaDeEnvios } from '../services/dailySendTaskService';
import { fetchDashboardSnapshot, type DashboardSnapshot } from '../services/dashboardService';
import type { AppSettings, ComparePeriod, Page } from '../types';
import { Select } from '../design';
import { PERIODOS, etiquetaCorta } from '../components/dashboard/comparePeriod';
import { LoadError } from '../design';
import { describeError } from '../utils/errorMessage';


// Tabs modulares
import OverviewTab from './dashboard/OverviewTab';
import PipelineTab from './dashboard/PipelineTab';
import TasksTab from './dashboard/TasksTab';
import DashboardTabs, { type DashboardTab } from './dashboard/DashboardTabs';
import PipelineReport from '../components/dashboard/PipelineReport';
import FunnelReport from '../components/dashboard/FunnelReport';
import { formatearFechaLarga } from '../utils/date';

export default function DashboardPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [reportType, setReportType] = useState<'acquisition' | 'funnel' | null>(null);
  const { user } = useAuth();

  /** El fallo de carga y el contador que permite reintentar. */
  const [fallo, setFallo] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /*
     * El `catch` que faltaba.
     *
     * Sin el, un fallo de red dejaba la promesa rechazada, `snapshot` en nulo y
     * el esqueleto girando PARA SIEMPRE: sin mensaje, sin reintento y sin
     * salida. Es el peor de los estados posibles -peor que un error- porque no
     * se distingue de "todavia esta cargando" y no invita a hacer nada.
     */
    (async () => {
      try {
        const nextSettings = await getSettings();
        if (cancelled) return;
        setSettings(nextSettings);

        if (!user) {
          setSnapshot(null);
          return;
        }

        const nextSnapshot = await fetchDashboardSnapshot(nextSettings.dashboardComparePeriod);
        if (!cancelled) setSnapshot(nextSnapshot);

        /*
         * LA TAREA DIARIA DE ENVIOS, SI TOCA.
         *
         * Va DESPUES de pintar el panel y sin `await` que lo bloquee: es un
         * efecto lateral util, no algo que el usuario este esperando. Si falla,
         * el panel se ve igual.
         *
         * La comprobacion de "ya se creo hoy" no esta aqui sino dentro del RPC,
         * con la fila del perfil bloqueada: dos ventanas abiertas a la vez
         * llegarian las dos, y hacerlo aqui crearia dos tareas.
         */
        void asegurarTareaDiariaDeEnvios();
      } catch (error) {
        if (!cancelled) setFallo(describeError(error));
      }
    })();

    return () => { cancelled = true; };
  }, [user, intento]);

  if (fallo) {
    return (
      <LoadError
        title="No se pudo cargar el panel"
        description={fallo}
        onRetry={() => {
          setFallo('');
          setIntento((n) => n + 1);
        }}
      />
    );
  }

  if (!settings || !snapshot) {
    // Skeleton genérico simple
    return (
      <div className="flex w-full flex-col pb-6 animate-pulse">
         <div className="h-8 bg-surface-sunken w-1/3 rounded mb-2"></div>
         <div className="h-4 bg-surface-sunken w-1/2 rounded mb-6"></div>
         <div className="h-64 bg-surface-hover rounded-[14px]"></div>
      </div>
    );
  }

  const compareLabel = etiquetaCorta(settings.dashboardComparePeriod);

  /**
   * Cambiar el periodo desde el panel.
   *
   * Estaba solo en Ajustes, tres pantallas mas alla de donde se miran los
   * numeros que compara. Aqui se guarda igual -es una preferencia, no un
   * estado de pantalla- y ademas recarga el snapshot, porque el periodo es un
   * parametro del RPC y no algo que se filtre en el cliente.
   */
  const cambiarPeriodo = async (periodo: ComparePeriod) => {
    const siguientes = { ...settings, dashboardComparePeriod: periodo };
    setSettings(siguientes);
    setSnapshot(await fetchDashboardSnapshot(periodo));
    try {
      await saveSettings(siguientes);
    } catch {
      // El panel ya muestra el periodo nuevo; que no se recuerde para la
      // proxima sesion no merece interrumpir la lectura.
    }
  };

  return (
    <div className="flex w-full flex-col">
      
      {/* Navegación de Tabs Sticky y Date Picker */}
      <div className="flex w-full mb-3 border-b border-line justify-between items-end pb-1">
        <DashboardTabs activeTab={activeTab} onSelect={(tab) => { setActiveTab(tab); setReportType(null); }} />
        
        {/*
          AQUI HABIA UN BOTON DE CALENDARIO QUE NO HACIA NADA.

          El comentario del codigo lo llamaba "(Mock)": icono, chevron de
          desplegable y ningun manejador.

          Ahora es el selector de comparacion, que es lo que la fecha sugeria
          sin serlo. No es un filtro de rango -el panel siempre muestra HOY-,
          es contra que se mide ese hoy, y por eso el rotulo dice "Hoy" y el
          desplegable dice "contra que".

          El control ya existia, enterrado en Ajustes. Se queda alli tambien:
          es la misma preferencia y se guarda en el mismo sitio.
        */}
        <div className="flex shrink-0 items-center gap-2 pb-1.5">
          <span className="hidden items-center gap-1.5 text-meta text-ink-secondary panel-md:flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Hoy, {formatearFechaLarga(new Date())}
          </span>
          <Select
            compact
            fullWidth={false}
            aria-label="Comparar contra"
            title="Contra qué período se comparan los números de hoy"
            value={settings.dashboardComparePeriod}
            onChange={(evento) => void cambiarPeriodo(evento.target.value as ComparePeriod)}
            className="w-[140px]"
          >
            {PERIODOS.map((periodo) => (
              <option key={periodo.valor} value={periodo.valor}>
                {periodo.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Contenido Dinámico Modulizado */}
      <div className="mt-2">
        {reportType === 'acquisition' && (
          <PipelineReport snapshot={snapshot} onClose={() => setReportType(null)} />
        )}
        {reportType === 'funnel' && (
          <FunnelReport snapshot={snapshot} onClose={() => setReportType(null)} />
        )}
        {!reportType && (
          <>
            {activeTab === 'overview' && (
              <OverviewTab 
                snapshot={snapshot} 
                settings={settings} 
                compareLabel={compareLabel} 
                onNavigate={onNavigate} 
              />
            )}
            {activeTab === 'pipeline' && (
              <PipelineTab 
                snapshot={snapshot} 
                onNavigate={onNavigate} 
                onViewReport={(type) => setReportType(type)}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksTab 
                snapshot={snapshot} 
                onNavigate={onNavigate} 
              />
            )}
          </>
        )}
      </div>

    </div>
  );
}
