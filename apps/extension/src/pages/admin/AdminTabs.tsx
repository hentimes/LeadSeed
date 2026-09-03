import type { ReactNode } from 'react';
import { CountBadge } from '../../components/admin/CountBadge';

export type AdminTab = 'users' | 'catalog' | 'support';

interface TabDef {
  id: AdminTab;
  label: string;
  icon: ReactNode;
}

/**
 * Las tres secciones de Admin.
 *
 * Antes eran cuatro, con rotulos de dos y tres palabras ("Usuarios y
 * Mensajes", "Perfiles y Planes") dentro de un `overflow-x-auto`: a 320px se
 * salian de la pantalla y habia que arrastrarlas con la rueda del raton.
 *
 * Dos de aquellas cuatro eran la misma entidad vista a distinta distancia. Una
 * funcionalidad se creaba en "Funcionalidades", se metia en un plan en
 * "Perfiles y Planes" y se regalaba a un usuario suelto en "Licencias": tres
 * pantallas para una cadena que nadie veia entera. Las dos primeras se funden
 * en **Catalogo**.
 *
 * La forma es la misma que la del Dashboard y la de Enviar: subrayado abajo,
 * icono de 18px, y debajo de `panel-sm` solo la pestana activa ensena su
 * nombre -las otras se quedan en icono, que sigue midiendo 44px de blanco y
 * conserva su nombre accesible.
 */
const TABS: TabDef[] = [
  {
    id: 'users',
    label: 'Usuarios',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  },
  {
    id: 'support',
    label: 'Soporte',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  },
];

export default function AdminTabs({
  activeTab,
  onSelect,
  visibleTabs,
  openRequirements,
}: {
  activeTab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  visibleTabs: AdminTab[];
  openRequirements: number;
}) {
  const tabs = TABS.filter((tab) => visibleTabs.includes(tab.id));

  // Con un solo destino la barra no navega a ningun sitio: solo gasta 44px de
  // alto para repetir donde estas. Es lo que veia el helper.
  if (tabs.length < 2) return null;

  return (
    <div className="flex w-full min-w-0 items-end border-b border-line pb-1" role="tablist" aria-label="Secciones de administración">
      {tabs.map(({ id, label, icon }) => {
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
            <span className={`truncate ${isActive ? '' : 'hidden panel-sm:inline'}`}>{label}</span>
            {id === 'support' && <CountBadge count={openRequirements} tone="warning" label="requerimientos abiertos" />}
          </button>
        );
      })}
    </div>
  );
}
