import { useState, useRef, useEffect } from 'react';

interface Props {
  onSelect: (variable: string) => void;
  direction?: 'up' | 'down';
}

export default function VariableDropdown({ onSelect, direction = 'down' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const variables = ['nombre', 'telefono', 'email', 'empresa', 'notas', 'rut'];

  const dropdownClass = direction === 'up' 
    ? "absolute right-0 bottom-full mb-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 text-xs"
    : "absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 text-xs";

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs hover:bg-blue-100 flex items-center font-mono font-bold text-blue-700 transition-colors shadow-sm"
        title="Insertar variable"
      >
        {'{ }'}
      </button>
      {open && (
        <div className={dropdownClass}>
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 border-b mb-1">
            Variables
          </div>
          {variables.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => {
                onSelect(`{${v}}`);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 font-mono transition-colors"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
