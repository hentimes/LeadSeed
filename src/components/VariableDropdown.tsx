import { useState, useRef, useEffect } from 'react';
import { Button } from '../design';

interface Props {
  onSelect: (variable: string) => void;
  /**
   * Fuerza la direccion. Sin esto se decide sola segun el sitio que quede.
   * Se conserva para los casos en que quien llama sepa algo que la medicion no.
   */
  direction?: 'up' | 'down';
}

// 'motivo' no sale del lead: se elige de un catalogo al enviar. Va en la
// misma lista porque para quien escribe la plantilla es un hueco igual que
// los demas.
const VARIABLES = ['nombre', 'telefono', 'email', 'empresa', 'notas', 'rut', 'motivo'];

/** Alto aproximado del panel. Sirve para decidir la direccion antes de pintarlo. */
const ALTO_ESTIMADO = 240;

export default function VariableDropdown({ onSelect, direction }: Props) {
  const [open, setOpen] = useState(false);
  const [autoDirection, setAutoDirection] = useState<'up' | 'down'>('down');
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

  /**
   * Decide hacia donde abrir midiendo el sitio que queda debajo del boton.
   *
   * La extension vive en una columna estrecha y alta: desplegando siempre hacia
   * abajo, los campos de la mitad inferior dejaban la lista fuera de la vista.
   * Se noto al pasar de seis variables a siete, pero el problema estaba desde
   * antes; la septima solo lo hizo visible.
   */
  const abrir = () => {
    if (!open && containerRef.current) {
      const { bottom } = containerRef.current.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - bottom;
      setAutoDirection(espacioAbajo < ALTO_ESTIMADO ? 'up' : 'down');
    }
    setOpen(!open);
  };

  const hacia = direction ?? autoDirection;

  const dropdownClass =
    hacia === 'up'
      ? 'absolute right-0 bottom-full mb-1 w-32 card-standard z-50 py-1 text-xs'
      : 'absolute right-0 top-full mt-1 w-32 card-standard z-50 py-1 text-xs';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        type="button"
        size="sm"
        className="font-mono"
        onClick={abrir}
        title="Insertar variable"
        aria-label="Insertar variable"
        aria-expanded={open}
      >
        {'{ }'}
      </Button>
      {open && (
        <div className={dropdownClass}>
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-ink-muted border-b border-line mb-1">
            Variables
          </div>
          {/* Tope de alto con scroll: si la medicion falla o la ventana es muy
              baja, la lista se recorta dentro de si misma en vez de salirse. */}
          <div className="max-h-[40vh] overflow-y-auto">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onSelect(`{${v}}`);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-ink-secondary font-mono transition-colors"
              >
                {`{${v}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
