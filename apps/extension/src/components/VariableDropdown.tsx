import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../design';

interface Props {
  onSelect: (variable: string) => void;
}

// 'motivo' no sale del lead: se elige de un catalogo al enviar. Va en la
// misma lista porque para quien escribe la plantilla es un hueco igual que
// los demas.
const VARIABLES = ['nombre', 'telefono', 'email', 'empresa', 'notas', 'rut', 'motivo'];

const ANCHO = 132;
const ALTO = 232;
const MARGEN = 8;

/**
 * INSERTAR UNA VARIABLE
 *
 * ## Por que va en un portal
 *
 * Estaba anclado con `absolute` dentro de su contenedor y medido contra la
 * ventana. Las dos cosas juntas fallaban dentro del editor de plantillas: el
 * panel se salia del modal por el borde izquierdo y quedaba cortado, tapando
 * ademas el texto del formulario.
 *
 * El error de fondo era medir contra quien no recorta. Quien recorta es el
 * modal, no la ventana, asi que ninguna cuenta hecha con `window.innerWidth`
 * podia acertar. Y no hay `overflow` que aflojar sin romper el scroll del
 * formulario.
 *
 * La unica salida es que el panel no viva dentro de ese contenedor: se monta en
 * `document.body` con posicion fija, medido contra el boton que lo abrio. Es lo
 * mismo que hacen `design/Modal.tsx` y `lists/ColorPickerButton.tsx`.
 *
 * ## El cierre al tocar afuera
 *
 * Con el panel en un portal, "afuera" ya no es "fuera del contenedor": el panel
 * es hijo de `body`, asi que el manejador de siempre lo habria cerrado al tocar
 * cualquiera de sus opciones, antes de que llegara el clic. Por eso se
 * comprueban los dos: el boton y el panel.
 */
export default function VariableDropdown({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const botonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const alTocarFuera = (evento: MouseEvent) => {
      const destino = evento.target as Node;
      if (botonRef.current?.contains(destino) || panelRef.current?.contains(destino)) return;
      setOpen(false);
    };

    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('keydown', alPulsarEscape);
    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('keydown', alPulsarEscape);
    };
  }, [open]);

  /*
   * `useLayoutEffect` y no `useEffect`: se mide y se coloca ANTES de pintar. Con
   * `useEffect` el panel aparece un fotograma en la esquina y salta a su sitio.
   */
  useLayoutEffect(() => {
    if (!open || !botonRef.current) return;
    const caja = botonRef.current.getBoundingClientRect();

    // Debajo si cabe; si no, encima.
    const cabeAbajo = caja.bottom + ALTO + MARGEN <= window.innerHeight;
    const top = cabeAbajo ? caja.bottom + 4 : Math.max(MARGEN, caja.top - ALTO - 4);

    // Y acotado a los lados para que no se salga por ningun borde.
    const left = Math.min(
      Math.max(MARGEN, caja.left),
      Math.max(MARGEN, window.innerWidth - ANCHO - MARGEN)
    );

    setPosicion({ top, left });
  }, [open]);

  return (
    <div className="inline-block" ref={botonRef}>
      <Button
        type="button"
        size="sm"
        className="font-mono"
        onClick={() => setOpen((estaba) => !estaba)}
        title="Insertar variable"
        aria-label="Insertar variable"
        aria-expanded={open}
      >
        {'{ }'}
      </Button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Insertar variable"
            style={{ top: posicion?.top ?? 0, left: posicion?.left ?? 0, width: ANCHO }}
            className={`fixed z-[200] rounded-lg border border-line bg-surface py-1 text-micro shadow-float ${
              posicion ? '' : 'invisible'
            }`}
          >
            <div className="mb-1 border-b border-line px-3 py-1 text-micro font-bold uppercase text-ink-muted">
              Variables
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => {
                    onSelect(`{${variable}}`);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left font-mono text-ink-secondary transition-colors hover:bg-surface-hover"
                >
                  {`{${variable}}`}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
