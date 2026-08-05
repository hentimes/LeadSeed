import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../utils/icons';

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
  const [position, setPosition] = useState(() => {
    const offset = cascadeIndex * CASCADE_STEP;
    return {
      x: Math.max(MARGIN, window.innerWidth - width - MARGIN * 2 - offset),
      y: Math.max(MARGIN, window.innerHeight - height - MARGIN * 2 - offset),
    };
  });

  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(MARGIN, x), Math.max(MARGIN, window.innerWidth - width - MARGIN)),
      y: Math.min(Math.max(MARGIN, y), Math.max(MARGIN, window.innerHeight - height - MARGIN)),
    }),
    [width, height]
  );

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
    const onResize = () => setPosition((prev) => clamp(prev.x, prev.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  return createPortal(
    <section
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
      className="fixed z-[190] flex flex-col overflow-hidden rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl animate-scale-in"
      style={{ left: position.x, top: position.y, width, height }}
    >
      <header
        onPointerDown={(event) => {
          dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
        }}
        className="flex items-center gap-2 px-3 py-2 bg-surface-muted dark:bg-gray-800 border-b border-line dark:border-gray-700 cursor-grab active:cursor-grabbing select-none"
      >
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-ink dark:text-gray-100">
          {title}
        </span>
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            onPointerDown={(event) => event.stopPropagation()}
            className="p-1 rounded-full text-ink-muted hover:bg-white dark:hover:bg-gray-700 hover:text-ink transition-colors"
            title="Minimizar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          className="p-1 rounded-full text-ink-muted hover:bg-white dark:hover:bg-gray-700 hover:text-ink transition-colors"
          title="Cerrar"
        >
          <Icon.Close />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>,
    document.body
  );
}
