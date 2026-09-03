import { lazy, Suspense, useEffect, useState } from 'react';
import type { ColumnDef, ExportFormat } from '../types';
import { getSettings } from '../services/appSettingsService';
import { SectionHeader } from '../design';
import SettingsTabs from './settings/SettingsTabs';
import { hashDeTab, rutaDesdeHash, type SettingsTab } from './settings/settingsRoutes';
import { setLocationHash } from '../components/layout/useLocationHash';
import GeneralSettings from '../components/settings/GeneralSettings';
import DataManagement from '../components/settings/DataManagement';
import AlertsManager from '../components/settings/AlertsManager';

const ChannelsSettings = lazy(() => import('../components/settings/ChannelsSettings'));
const AgendaSettings = lazy(() => import('../components/settings/AgendaSettings'));
const AccountPanel = lazy(() => import('../components/settings/AccountPanel'));

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

/**
 * El icono y el nombre de la seccion abierta.
 *
 * Es lo que permite que las pestanas sean de solo icono por debajo de
 * `panel-lg`: el nombre completo esta aqui, a cuarenta pixeles del icono que
 * lo selecciono, asi que repetirlo dentro de la pestana solo gastaria el ancho
 * que hace falta para que quepan las seis.
 */
const CABECERAS: Record<SettingsTab, { title: string; icon: JSX.Element }> = {
  general: {
    title: 'General',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  },
  data: {
    title: 'Datos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg>,
  },
  alerts: {
    title: 'Avisos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  channels: {
    title: 'Canales',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  agenda: {
    title: 'Agenda',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  account: {
    title: 'Cuenta',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
};

/**
 * Configuracion.
 *
 * ## Lo que faltaba
 *
 * Esta pagina **no pintaba ninguna navegacion**. Elegia que subseccion montar
 * leyendo `window.location.hash`, y quedaba hasta un comentario `{/* Content *\/}`
 * donde deberia haber estado la barra. Para pasar de "Datos" a "Email" habia
 * que salir de la pagina, ir al rail, abrir el desplegable de Ajustes y elegir
 * otra vez. Ahora la barra esta aqui y el hash sigue funcionando igual, porque
 * es como se entra desde el rail y desde el menu de usuario.
 *
 * ## Ocho subsecciones en seis pestanas
 *
 * No es una preferencia: con el blanco tactil de 44px, ocho pestanas piden
 * 352px y el panel mas estrecho que hay que soportar tiene 288 utiles. Ver
 * `SettingsTabs` para la cuenta completa y para donde fue cada una.
 */
export default function SettingsPage({
  compactMode,
  onCompactModeChange,
  darkMode,
  onDarkModeChange,
  visibleCols,
  onColsChange,
}: Props) {
  const rutaInicial = rutaDesdeHash(window.location.hash);
  const [tab, setTab] = useState<SettingsTab>(rutaInicial?.tab ?? 'general');
  const [bloqueInicial, setBloqueInicial] = useState<string | undefined>(rutaInicial?.block);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    let activo = true;
    void getSettings().then((s) => {
      if (activo) setExportFormat(s.exportFormat);
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const alCambiarHash = () => {
      const siguiente = rutaDesdeHash(window.location.hash);
      if (!siguiente) return;
      // Guarda obligatoria: escribir el hash al cambiar de pestana dispara
      // este mismo evento, y sin esto se reabriria el bloque que el usuario
      // acaba de cerrar a mano.
      setTab((actual) => (actual === siguiente.tab ? actual : siguiente.tab));
      if (siguiente.block) setBloqueInicial(siguiente.block);
    };
    window.addEventListener('hashchange', alCambiarHash);
    return () => window.removeEventListener('hashchange', alCambiarHash);
  }, []);

  const elegirPestana = (siguiente: SettingsTab) => {
    setTab(siguiente);
    // Elegir la pestana a mano no abre ningun bloque: eso solo lo pide un
    // enlace que apunte a uno concreto.
    setBloqueInicial(undefined);
    // La URL sigue a la pestana, para que volver a Ajustes desde el rail te
    // devuelva donde estabas y no a la ultima seccion que abrio un enlace.
    setLocationHash(hashDeTab(siguiente));
  };

  const cabecera = CABECERAS[tab];

  return (
    <div className="flex flex-col gap-3">
      <SettingsTabs activeTab={tab} onSelect={elegirPestana} />

      <SectionHeader icon={cabecera.icon} title={cabecera.title} />

      <Suspense fallback={<div className="h-11 animate-pulse rounded-md bg-surface-sunken" />}>
        {/*
          La `key` incluye el bloque: los paneles leen `initialBlock` como
          semilla de un `useState`, y un `useState` no se reevalua en un
          re-render. Sin esto, llegar por `#support` estando ya en Cuenta -o
          por `#email` estando ya en Canales- actualizaba el estado del padre
          pero no abria nada, porque el hijo seguia montado.
        */}
        {tab === 'general' && (
          <GeneralSettings
            key={`general-${bloqueInicial ?? ''}`}
            compactMode={compactMode}
            onCompactModeChange={onCompactModeChange}
            darkMode={darkMode}
            onDarkModeChange={onDarkModeChange}
            visibleCols={visibleCols}
            onColsChange={onColsChange}
            initialBlock={bloqueInicial}
          />
        )}
        {tab === 'data' && (
          <DataManagement exportFormat={exportFormat} onExportFormatChange={setExportFormat} />
        )}
        {tab === 'alerts' && <AlertsManager />}
        {tab === 'channels' && (
          <ChannelsSettings key={`channels-${bloqueInicial ?? ''}`} initialBlock={bloqueInicial} />
        )}
        {tab === 'agenda' && <AgendaSettings />}
        {tab === 'account' && (
          <AccountPanel key={`account-${bloqueInicial ?? ''}`} initialBlock={bloqueInicial} />
        )}
      </Suspense>
    </div>
  );
}
