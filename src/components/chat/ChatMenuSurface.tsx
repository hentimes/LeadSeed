import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFlipOnOverflow } from '../../hooks/useFlipOnOverflow';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

/**
 * ANDAMIAJE COMUN DE LOS MENUS FLOTANTES DEL CHAT
 *
 * Los cuatro menus del chat -autor, fijar, reportar y acciones- repetian el
 * mismo bloque: un `fixed inset-0` que captura el clic de fuera, un panel
 * absoluto con borde y sombra, `useFlipOnOverflow` para abrir hacia arriba
 * cuando no cabe abajo, y `useCloseOnEscape`. Cuatro copias del mismo JSX y
 * cuatro sitios donde acordarse de los dos hooks.
 *
 * Ademas resuelve algo que ninguna de las copias hacia: al abrirse, el foco
 * entra al menu, y al cerrarse vuelve al boton que lo abrio. Sin eso, quien
 * navega con teclado abre un menu y su foco se queda atras, en la pagina, sin
 * forma de llegar a las opciones (WCAG 2.2 AA 2.4.3).
 */
export default function ChatMenuSurface({
  onClose,
  children,
  label,
  align = 'right',
  width = 'w-44',
  className = '',
}: {
  onClose: () => void;
  children: ReactNode;
  /** Nombre del menu para el lector de pantalla. */
  label: string;
  align?: 'left' | 'right';
  width?: string;
  className?: string;
}) {
  useCloseOnEscape(onClose);
  const { ref, openUpward } = useFlipOnOverflow<HTMLDivElement>();
  const panelRef = useRef<HTMLDivElement | null>(null);

  /*
   * Volteo horizontal.
   *
   * `useFlipOnOverflow` solo mira el borde de abajo. En un panel de 320px eso
   * no alcanza: la pildora de acciones de un mensaje ajeno se ancla a la
   * derecha de la burbuja, y si la burbuja es corta y esta pegada al margen
   * izquierdo, un menu de 176px anclado con `right-0` arranca en una
   * coordenada negativa. Se veia literalmente cortado por el borde de la
   * ventana, con las opciones a medias ("...ar", "...la sala").
   *
   * `null` significa "todavia no se midio": hasta entonces manda la alineacion
   * que pidio quien lo abrio.
   */
  const [ladoMedido, setLadoMedido] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const caja = panel.getBoundingClientRect();
    if (caja.left < 0) setLadoMedido('left');
    else if (caja.right > window.innerWidth) setLadoMedido('right');
  }, []);

  const ladoEfectivo = ladoMedido ?? align;

  useEffect(() => {
    // Se guarda quien tenia el foco ANTES de montar: al cerrar hay que
    // devolverselo, o el recorrido con Tab reempieza desde el principio.
    const previo = document.activeElement as HTMLElement | null;
    const primero = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    // `preventScroll` porque el menu vive dentro de la lista de mensajes, que
    // hace scroll: sin el, enfocar la primera opcion arrastra la lista.
    primero?.focus({ preventScroll: true });

    return () => previo?.focus?.();
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      <div
        ref={(node) => {
          ref.current = node;
          panelRef.current = node;
        }}
        role="menu"
        aria-label={label}
        className={`absolute z-30 ${width} overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-float ${
          ladoEfectivo === 'right' ? 'right-0' : 'left-0'
        } ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} ${className}`}
      >
        {children}
      </div>
    </>
  );
}

/** Fila de un menu. Existe para que las cuatro listas usen el mismo alto. */
export function ChatMenuItem({
  children,
  onClick,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'neutral' | 'danger' | 'accent';
  icon?: ReactNode;
}) {
  const tonos = {
    neutral: 'text-ink hover:bg-surface-hover',
    danger: 'text-state-danger hover:bg-state-danger-soft',
    accent: 'text-accent hover:bg-accent-soft',
  };

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-meta font-medium transition-colors ${tonos[tone]}`}
    >
      {icon && <span className="w-4 shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      {children}
    </button>
  );
}

/** Encabezado de grupo dentro de un menu. */
export function ChatMenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-micro font-bold uppercase tracking-wider text-ink-muted">
      {children}
    </p>
  );
}
