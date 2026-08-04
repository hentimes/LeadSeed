import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../utils/icons';

interface FloatingWindowProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  height?: number;
}

const MARGIN = 8;

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
  children,
  width = 300,
  height = 380,
}: FloatingWindowProps) {
  const [position, setPosition] = useState(() => ({
    x: Math.max(MARGIN, window.innerWidth - width - MARGIN * 2),
    y: Math.max(MARGIN, window.innerHeight - height - MARGIN * 2),
  }));

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
