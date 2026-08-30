import type { ReactNode } from 'react';
import type { SettingsTab } from './settingsRoutes';

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: ReactNode;
}

/**
 * Las seis pestanas de Configuracion.
 *
 * ## Por que seis y no ocho
 *
 * Por aritmetica, no por gusto. El ancho util es `ventana - 48 del rail - 24
 * de relleno`, o sea **288px en el panel mas estrecho que hay que soportar**.
 * Con el blanco tactil minimo de 44px:
 *
 *   8 pestanas x 44 = 352  ->  no cabe, ni siquiera a 312
 *   6 pestanas x 44 = 264  ->  cabe, con 24px de sobra
 *
 * Para meter ocho habria que bajar a 36px por pestana, por debajo del minimo
 * tactil. Asi que reagrupar no era una opcion del rediseno: era su condicion.
 *
 * ## Por que aqui no se ensena el texto de la activa
 *
 * El patron del producto muestra el rotulo de la pestana activa y deja las
 * demas en icono. Con seis eso da `92 + 5 x 44 = 312`, que se sale otra vez.
 * Debajo de esta tira va siempre el encabezado de la seccion, con su icono y
 * su nombre completo a 40px de aqui: el rotulo dentro de la pestana seria una
 * repeticion, y la que cuesta el desbordamiento.
 *
 * A partir de `panel-lg` (476 utiles) caben las seis con texto: `6 x 76 = 456`.
 *
 * ## Restriccion que hereda quien anada una pestana
 *
 * Los rotulos son de **una palabra y como mucho 8 caracteres**. Con uno mas
 * largo, el modo con texto deja de caber a `panel-lg` y hay que subirlo de
 * punto de corte.
 */
const TABS: TabDef[] = [
  {
    id: 'general',
    label: 'General',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  },
  {
    id: 'data',
    label: 'Datos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg>,
  },
  {
    id: 'alerts',
    label: 'Avisos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    id: 'channels',
    label: 'Canales',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: 'account',
    label: 'Cuenta',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function SettingsTabs({
  activeTab,
  onSelect,
}: {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Secciones de configuración"
      className="flex w-full min-w-0 items-end border-b border-line pb-1"
    >
      {TABS.map(({ id, label, icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onSelect(id)}
            className={`-mb-[5px] flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[2px] pb-3 text-body font-medium transition-colors ${
              isActive ? 'border-primary text-ink' : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            {icon}
            <span className="hidden truncate panel-lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
