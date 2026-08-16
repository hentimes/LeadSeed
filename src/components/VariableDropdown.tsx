import { useState, useRef, useEffect } from 'react';
import { Button } from '../design';
import { decidirAnclaje } from '../utils/dropdownAnchor';

interface Props {
  onSelect: (variable: string) => void;
  /**
   * Fuerza la direccion vertical. Sin esto se decide sola segun el sitio que
   * quede. Se conserva para los casos en que quien llama sepa algo que la
   * medicion no.
   */
  direction?: 'up' | 'down';
}

// 'motivo' no sale del lead: se elige de un catalogo al enviar. Va en la
// misma lista porque para quien escribe la plantilla es un hueco igual que
// los demas.
const VARIABLES = ['nombre', 'telefono', 'email', 'empresa', 'notas', 'rut', 'motivo'];

/** Ancho del panel, el mismo que fija la clase `w-32`. */
const ANCHO = 128;

/** Alto aproximado del panel. Sirve para decidir la direccion antes de pintarlo. */
const ALTO_ESTIMADO = 240;

/** Margen minimo con el borde de la ventana para no pegarlo al filo. */
const MARGEN = 8;

export default function VariableDropdown({ onSelect, direction }: Props) {
  const [open, setOpen] = useState(false);
  const [vertical, setVertical] = useState<'up' | 'down'>('down');
  const [horizontal, setHorizontal] = useState<'left' | 'right'>('right');
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
   * Decide hacia donde abrir midiendo el sitio que queda alrededor del boton.
   *
   * Los dos ejes importan y por motivos distintos:
   *
   * - **Horizontal.** Anclado a la derecha del boton, el panel crece hacia la
   *   izquierda. Cuando el boton esta pegado al borde izquierdo -que es donde
   *   vive en el editor de plantillas- el panel se sale del sidebar. Se ancla a
   *   la izquierda y crece hacia la derecha, que es donde hay sitio.
   * - **Vertical.** En una columna alta, los campos de la mitad inferior dejaban
   *   la lista fuera de la vista.
   */
  const abrir = () => {
    if (!open && containerRef.current) {
      const caja = containerRef.current.getBoundingClientRect();
      const anclaje = decidirAnclaje(caja, {
        ancho: ANCHO,
        alto: ALTO_ESTIMADO,
        margen: MARGEN,
        ventanaAlto: window.innerHeight,
      });
      setHorizontal(anclaje.horizontal);
      setVertical(anclaje.vertical);
    }
    setOpen(!open);
  };

  const hacia = direction ?? vertical;

  const dropdownClass = [
    'absolute w-32 card-standard z-50 py-1 text-xs',
    horizontal === 'left' ? 'left-0' : 'right-0',
    hacia === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
  ].join(' ');

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
