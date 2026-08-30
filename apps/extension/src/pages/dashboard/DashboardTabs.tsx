import type { ReactNode } from 'react';

export type DashboardTab = 'overview' | 'pipeline' | 'tasks';

interface TabDef {
  id: DashboardTab;
  label: string;
  icon: ReactNode;
}

/**
 * El panel lateral arranca en 320px y el rail de navegacion se queda con 48.
 * Con tres pestanas de texto no alcanza: "Overview" pide 88px con su icono y
 * aqui hay 80 por pestana. Por eso debajo de `panel-sm` solo la pestana activa
 * muestra su nombre; las otras dos quedan en icono, que sigue siendo un blanco
 * de 44px y conserva el nombre accesible en `aria-label`.
 */
const TABS: TabDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  },
  {
    id: 'tasks',
    label: 'Tareas',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
];

interface Props {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}

export default function DashboardTabs({ activeTab, onSelect }: Props) {
  return (
    <div className="flex min-w-0 flex-1 gap-1 panel-sm:gap-2" role="tablist" aria-label="Vistas del panel">
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
            className={`-mb-[5px] flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 border-b-[2px] pb-3 text-[14px] font-medium transition-colors ${
              isActive
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            {icon}
            <span className={`truncate ${isActive ? '' : 'hidden panel-sm:inline'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
