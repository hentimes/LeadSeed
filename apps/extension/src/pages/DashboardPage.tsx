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
      
      {/*
        LA CABECERA SE QUEDA PEGADA AL DESPLAZAR.

        No es un adorno: es la consecuencia de haber quitado la etiqueta del
        periodo de cada tarjeta. Antes cada una repetia "vs ayer" pegado al
        dato, que era redundante pero sobrevivia al scroll. Ahora el periodo se
        declara UNA vez, aqui, asi que si esta fila se fuera con el scroll las
        flechas de las tarjetas de mas abajo se quedarian sin decir contra que
        se comparan.

        El fondo es opaco a proposito: sin el, el contenido se ve por debajo al
        pasar.
      */}
      <div className="sticky top-0 z-10 flex w-full items-end justify-between border-b border-line bg-surface-muted pb-1 mb-3">
        <DashboardTabs activeTab={activeTab} onSelect={(tab) => { setActiveTab(tab); setReportType(null); }} />

        {/*
          AQUI HUBO UN BOTON DE CALENDARIO QUE NO HACIA NADA, Y DESPUES LA
          FECHA DE HOY AL LADO DE ESTE DESPLEGABLE.

          Las dos sobraban. La fecha de hoy no es informacion -esto no es un
          calendario, y el panel siempre muestra hoy-, y ocupaba la mitad de la
          fila para decirlo.

          Queda solo el control, con un "vs" delante. Ese "vs" hace que el
          desplegable se lea como una frase completa -"vs Semana pasada"-, que
          es exactamente lo que decian las etiquetas que se quitaron de las
          tarjetas, dicho una sola vez y en el sitio donde ademas se cambia.

          Se oculta por debajo de `panel-sm` (408px), donde las pestañas ya
          caen a solo icono y cada pixel cuenta. No se pierde nada para quien
          usa lector de pantalla: eso lo cubre el `aria-label`, no este texto.
        */}
        <div className="flex shrink-0 items-center gap-1.5 pb-1.5">
          <span className="hidden text-micro font-medium text-ink-secondary panel-sm:inline" aria-hidden="true">
            vs
          </span>
          <Select
            compact
            fullWidth={false}
            /*
             * La frase entera y no "Comparar contra": un lector de pantalla
             * anuncia esto seguido del valor y del rol, y asi se entiende de
             * una vez que gobierna TODA la pagina y que la referencia es hoy.
             * Sin `title` ademas: duplicarlo es la misma redundancia que se
             * acaba de quitar, movida al arbol de accesibilidad.
             */
            aria-label="Contra qué período se comparan los números de hoy"
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
                periodo={settings.dashboardComparePeriod} 
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
