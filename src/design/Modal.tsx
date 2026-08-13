import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
 * Se encarga ademas de centrar, bloquear el scroll de atras y cerrar con Escape.
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

export function Modal({ onClose, children, maxWidth = '460px', label }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
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
        className="relative my-auto flex max-h-full w-full flex-col overflow-y-auto rounded-[8px] border border-line bg-surface shadow-2xl animate-scale-in"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
