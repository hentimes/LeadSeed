import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { siguienteFoco } from '../utils/focusCycle';

/**
 * Armazon unico para los modales.
 *
 * Se monta con un portal a document.body por una razon concreta: un elemento
 * "fixed" deja de posicionarse contra el viewport si algun ancestro tiene
 * transform, filter o contain, y pasa a posicionarse contra ese ancestro. Como
 * los modales vivian dentro de <main>, que ademas hace scroll, el panel
 * aparecia recortado y anclado a la lista en vez de al panel de la extension.
 * Sacandolo del arbol de la app el problema no puede volver a aparecer, sin
 * importar que clases se agreguen despues a los contenedores.
 *
 * Se encarga ademas de centrar, bloquear el scroll de atras, cerrar con Escape
 * y gestionar el foco.
 *
 * Lo del foco se agrego el `2026-08-16`: el dialogo se abria y el foco se
 * quedaba en el boton que lo habia abierto, detras del velo. Con teclado eso
 * significa tabular a ciegas por la pagina de atras antes de llegar al dialogo,
 * y al cerrarlo el foco se perdia al principio del documento.
 *
 * Se resuelve aqui y no en cada dialogo a proposito: es una pieza compartida y
 * arreglarla una vez cubre los que ya existen y los que vengan.
 */

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho maximo del panel. Por defecto el de las fichas de lead. */
  maxWidth?: string;
  /** Etiqueta accesible del dialogo. */
  label?: string;
}

/** Contenedores que hacen scroll detras del modal y hay que congelar. */
const SCROLL_LOCK_SELECTOR = 'main';

/**
 * Lo que puede recibir foco con Tab.
 *
 * Va como lista y no como una sola cadena porque el detector de clases muertas
 * lee este archivo entero -es una primitiva de diseno, donde las clases viven
 * en constantes- y una cadena con espacios la interpretaba como seis clases de
 * Tailwind inexistentes. Partirla tambien se lee mejor.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Los elementos enfocables visibles del dialogo.
 *
 * Consulta el DOM, por eso vive aqui y no en `utils/`: esa capa tiene prohibido
 * tocarlo para que el dominio pueda portarse a movil. La decision de a cual
 * saltar si esta en `utils/focusCycle`, que es pura y se prueba sola.
 */
function focusablesDe(contenedor: HTMLElement): HTMLElement[] {
  return Array.from(contenedor.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // `offsetParent` nulo delata lo que esta oculto con display:none.
    (el) => el.offsetParent !== null
  );
}

export function Modal({ onClose, children, maxWidth = '460px', label }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Quien tenia el foco antes de abrir. Se guarda para devolverselo al cerrar.
    const origen = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const destino = focusablesDe(panel)[0];
      if (destino) {
        destino.focus();
      } else {
        // Un dialogo sin controles sigue teniendo que recibir el foco, o el
        // lector de pantalla no lo anuncia.
        panel.focus();
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const destino = siguienteFoco(
        focusablesDe(panelRef.current),
        document.activeElement,
        event.shiftKey
      );
      if (destino) {
        event.preventDefault();
        destino.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // El scroll de la app no vive en body sino en <main>: la raiz ya tiene
    // overflow-hidden. Bloquear body solo no alcanzaba.
    const scroller = document.querySelector<HTMLElement>(SCROLL_LOCK_SELECTOR);
    const previousOverflow = scroller?.style.overflow ?? '';
    if (scroller) scroller.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (scroller) scroller.style.overflow = previousOverflow;
      // `isConnected` evita devolver el foco a un boton que ya no existe, cosa
      // habitual cuando el dialogo cierra porque su fila se borro.
      if (origen && origen.isConnected) origen.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      {/* my-auto centra el panel cuando entra, y lo deja crecer hacia abajo
          con scroll propio cuando no cabe, en vez de recortarse. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative my-auto flex max-h-full w-full flex-col overflow-y-auto rounded-[8px] border border-line bg-surface shadow-2xl animate-scale-in outline-none"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
