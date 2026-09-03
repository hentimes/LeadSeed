import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../utils/icons';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

interface FloatingWindowProps {
  title: ReactNode;
  onClose: () => void;
  /** Si se pasa, aparece un boton de minimizar ademas del de cerrar. */
  onMinimize?: () => void;
  children: ReactNode;
  width?: number;
  height?: number;
  /**
   * Cuando hay varias ventanas abiertas a la vez, cada una se abre con un
   * indice distinto para que no queden exactamente superpuestas.
   */
  cascadeIndex?: number;
}

const MARGIN = 8;
const CASCADE_STEP = 28;

/**
 * Ventana flotante arrastrable dentro del panel de la extension.
 *
 * Se monta con un portal por el mismo motivo que Modal: un elemento "fixed"
 * dentro de un ancestro con transform deja de posicionarse contra el viewport.
 * A diferencia de Modal no bloquea el fondo: la idea es poder seguir usando la
 * extension con la conversacion abierta al costado.
 *
 * ## Lo que se arreglo el 2026-08-25
 *
 * 1. **Medida fija.** Eran 300x380 constantes. El panel lateral de Chrome se
 *    redimensiona desde ~320px: una ventana de 300 de ancho no solo lo tapaba
 *    casi entero, sino que con el panel mas angosto se salia por el borde. Ahora
 *    nunca pasa del espacio disponible.
 * 2. **No cerraba con Escape** aunque se anuncia como `role="dialog"`: quien
 *    navega con teclado quedaba atrapado (WCAG 2.2 AA 2.1.2).
 * 3. **El foco no entraba ni volvia.** Al abrir, el teclado seguia en la pagina
 *    de atras; al cerrar, el recorrido con Tab reempezaba desde cero.
 *
 * Queda pendiente, y es un cambio estructural aparte: por debajo de `panel-md`
 * esto deberia dejar de flotar y ocupar la vista entera con un "volver", en vez
 * de superponerse a la sala.
 */
export default function FloatingWindow({
  title,
  onClose,
  onMinimize,
  children,
  width = 300,
  height = 380,
  cascadeIndex = 0,
}: FloatingWindowProps) {
  useCloseOnEscape(onClose);

  const [viewport, setViewport] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));

  // Medida efectiva: la pedida, o lo que quepa si el panel es mas chico.
  const size = useMemo(
    () => ({
      width: Math.min(width, Math.max(220, viewport.w - MARGIN * 2)),
      height: Math.min(height, Math.max(240, viewport.h - MARGIN * 2)),
    }),
    [width, height, viewport]
  );

  const [position, setPosition] = useState(() => {
    const offset = cascadeIndex * CASCADE_STEP;
    return {
      x: Math.max(MARGIN, window.innerWidth - width - MARGIN * 2 - offset),
      y: Math.max(MARGIN, window.innerHeight - height - MARGIN * 2 - offset),
    };
  });

  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(MARGIN, x), Math.max(MARGIN, viewport.w - size.width - MARGIN)),
      y: Math.min(Math.max(MARGIN, y), Math.max(MARGIN, viewport.h - size.height - MARGIN)),
    }),
    [size, viewport]
  );

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const primero = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
    );
    primero?.focus({ preventScroll: true });

    return () => previo?.focus?.();
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragOffset.current) return;
      setPosition(clamp(event.clientX - dragOffset.current.x, event.clientY - dragOffset.current.y));
    };

    const onPointerUp = () => {
      dragOffset.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [clamp]);

  // Si el panel cambia de tamano, la ventana no puede quedar fuera de vista.
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recolocar cuando cambia el tamano disponible, no solo al arrastrar.
  useEffect(() => {
    setPosition((prev) => clamp(prev.x, prev.y));
  }, [clamp]);

  const botonCabecera =
    'rounded-full p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink';

  return createPortal(
    <section
      ref={panelRef}
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
      className="animate-scale-in fixed z-[190] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      <header
        onPointerDown={(event) => {
          dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
        }}
        className="flex cursor-grab select-none items-center gap-2 border-b border-line bg-surface-sunken px-3 py-2 active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1 truncate text-meta font-semibold text-ink">{title}</span>

        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            onPointerDown={(event) => event.stopPropagation()}
            title="Minimizar"
            aria-label="Minimizar conversación"
            className={botonCabecera}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          title="Cerrar"
          aria-label="Cerrar conversación"
          className={botonCabecera}
        >
          <Icon.Close />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>,
    document.body
  );
}
