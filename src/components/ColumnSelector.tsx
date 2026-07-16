import { useState, useRef, useEffect } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
}

interface Props {
  columns: ColumnDef[];
  onChange: (columns: ColumnDef[]) => void;
}

function ColumnSelector({ columns, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => {
    onChange(columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="border border-slate-300 dark:border-slate-600/50 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800/80 dark:backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-1"
      >
        Columnas ({visibleCount}/{columns.length})
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border rounded-lg shadow-lg z-20 p-2 min-w-[180px]">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:bg-slate-900 rounded cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => toggle(col.key)}
                className="rounded"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
