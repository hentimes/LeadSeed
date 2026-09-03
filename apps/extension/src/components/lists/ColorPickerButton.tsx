import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { AVAILABLE_COLORS, nombreDeColor } from '../../utils/listColors';

/**
 * COLOR DE UNA LISTA
 *
 * Un punto que muestra el color puesto y abre los veinte.
 *
 * ## Por que va en un portal y no `absolute`
 *
 * Estaba anclado con `absolute` dentro de la fila, y eso lo recortaba: la
 * paleta vive dentro del cuerpo del modal, que es `overflow-y-auto`, y todo lo
 * que se sale de un contenedor con scroll se corta. Con pocas listas el modal
 * es bajo y la ultima fila de colores quedaba cortada por el borde.
 *
 * No hay `overflow` que arreglar sin romper el scroll de la lista: la unica
 * salida es que el desplegable no viva dentro de ese contenedor. Se monta en
 * `document.body` con posicion fija, medida contra el punto que lo abrio. Es el
 * mismo motivo por el que `design/Modal.tsx` usa un portal.
 *
 * ## El tamano
 *
 * 5 x 4 celdas de 28px: 172px de ancho y 136 de alto. La muestra visible es de
 * 16px, centrada en un objetivo de 28. Esa separacion importa de cara al port a
 * movil: el minimo de WCAG 2.2 AA (2.5.8) son 24x24, y achicar el objetivo al
 * tamano del punto dejaria la paleta inservible con el dedo.
 *
 * ## Los hexadecimales
 *
 * Se aplican con `style` y no con clases. Es una de las tres excepciones que
 * documenta `design/README.md`: son colores que elige el usuario para SUS
 * listas, o sea datos. Y aunque no lo fueran, una clase de Tailwind armada en
 * tiempo de ejecucion (`bg-${hex}`) no llega a generarse nunca.
 */

/** Medidas de la paleta, en pixeles. Se usan para decidir si cabe abajo. */
const ANCHO = 172;
const ALTO = 136;
const MARGEN = 8;

function Paleta({
  anchor,
  value,
  onChange,
  onClose,
}: {
  anchor: HTMLElement;
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  useCloseOnEscape(onClose);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);

  /*
   * `useLayoutEffect` y no `useEffect`: se mide y se coloca ANTES de pintar. Con
   * `useEffect` la paleta aparece un fotograma en la esquina y salta a su sitio.
   */
  useLayoutEffect(() => {
    const caja = anchor.getBoundingClientRect();

    // Debajo si cabe; si no, encima. Es lo mismo que hace `useFlipOnOverflow`,
    // pero contra la ventana en vez de contra el contenedor.
    const cabeAbajo = caja.bottom + ALTO + MARGEN <= window.innerHeight;
    const top = cabeAbajo ? caja.bottom + 4 : Math.max(MARGEN, caja.top - ALTO - 4);

    // Y se acota a los lados para que no se salga por ningun borde.
    const left = Math.min(
      Math.max(MARGEN, caja.left),
      Math.max(MARGEN, window.innerWidth - ANCHO - MARGEN)
    );

    setPosicion({ top, left });
  }, [anchor]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[190]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Elegir color"
        style={{ top: posicion?.top ?? 0, left: posicion?.left ?? 0, width: ANCHO }}
        className={`fixed z-[200] grid grid-cols-5 gap-1 rounded-lg border border-line bg-surface p-2 shadow-float ${
          posicion ? '' : 'invisible'
        }`}
      >
        {AVAILABLE_COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            onClick={() => {
              onChange(color.hex);
              onClose();
            }}
            aria-pressed={color.hex === value}
            // El nombre va en el nombre accesible y no solo en el `title`: el
            // color como unico portador del dato incumple WCAG 1.4.1.
            aria-label={color.name}
            title={color.name}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-surface-hover"
          >
            <span
              className={`h-4 w-4 rounded-full border border-line-soft ${
                color.hex === value ? 'ring-2 ring-focus ring-offset-1' : ''
              }`}
              style={{ backgroundColor: color.hex }}
            />
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}

export default function ColorPickerButton({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  /**
   * Nombre accesible. Con una fila por lista, "Color de la lista" repetido
   * veinte veces no le dice a nadie cual es cual.
   */
  label?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Al cerrar, el foco vuelve al punto que abrio la paleta.
  useEffect(() => {
    if (!abierto) return;
    return () => botonRef.current?.focus({ preventScroll: true });
  }, [abierto]);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${label ?? 'Color de la lista'}: ${nombreDeColor(value)}`}
        title={`${label ?? 'Color'}: ${nombreDeColor(value)}`}
        className="flex h-control-sm w-control-sm shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover"
      >
        {/* El borde existe para que el blanco y el negro sigan teniendo forma
            sobre la superficie: sin el, el blanco desaparece. */}
        <span
          className="h-3.5 w-3.5 rounded-full border border-line-soft"
          style={{ backgroundColor: value }}
        />
      </button>

      {abierto && botonRef.current && (
        <Paleta
          anchor={botonRef.current}
          value={value}
          onChange={onChange}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}
