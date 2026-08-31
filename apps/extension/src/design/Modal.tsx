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
  /**
   * Donde se apoya el panel.
   *
   * `center` es lo de siempre y sigue siendo el defecto. `top` lo ancla a una
   * altura fija.
   *
   * Sirve para los dialogos que cambian de alto sin cerrarse -los que tienen
   * pestanas dentro-. Centrado, cada alto da un tope distinto: al pasar de una
   * pestana larga a una corta el panel entero se reacomoda de golpe y se lee
   * como un salto, aunque solo haya cambiado el contenido. Anclado arriba, la
   * cabecera y las pestanas se quedan donde estaban y solo crece o se encoge el
   * borde de abajo, que es lo unico que de verdad cambio.
   */
  align?: 'center' | 'top';
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

export function Modal({ onClose, children, maxWidth = '460px', label, align = 'center' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * `onClose` en una ref, y el efecto SIN dependencias.
   *
   * Antes el efecto dependia de `[onClose]`, y casi todos los llamadores pasan
   * una flecha en linea (`onClose={() => setAbierto(false)}`), que es una
   * funcion nueva en cada render del padre. Cuando el texto de un campo vive en
   * ese padre -el caso de `ReasonManagerModal`, cuyo `texto` lo guarda
   * `TemplatesPage`- la cadena era:
   *
   *   tecla -> setState en el padre -> el padre repinta -> nueva identidad de
   *   `onClose` -> el efecto se vuelve a ejecutar -> enfoca de nuevo el primer
   *   elemento del panel, que es la X de cerrar.
   *
   * Resultado: no se podia escribir. Cada caracter mandaba el foco al boton de
   * cerrar. Pasaba en todo dialogo con un campo cuyo estado viviera arriba.
   *
   * El efecto tiene que correr UNA vez, al montar: enfocar al abrir, atrapar el
   * foco, bloquear el scroll y devolver el foco al cerrar son cosas de ciclo de
   * vida, no de cada render. Lo unico que necesita el valor fresco es el
   * manejador de Escape, y para eso esta la ref.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

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
        onCloseRef.current();
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
    // Sin dependencias a proposito: ver la nota de `onCloseRef` arriba. La regla
    // de dependencias no protesta porque el efecto ya no lee `onClose`, solo la
    // ref, que es justamente la senal de que la dependencia sobraba.
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-[200] flex justify-center overflow-y-auto overscroll-contain bg-slate-900/40 p-4 backdrop-blur-sm ${
        align === 'top' ? 'items-start pt-12' : 'items-center'
      }`}
    >
      {/* Centrado, `my-auto` centra el panel al entrar y lo deja crecer hacia
          abajo con scroll propio cuando no cabe, en vez de recortarse. Anclado
          arriba no se aplica: ahi el tope lo fija el contenedor. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-full w-full flex-col overflow-y-auto rounded-[8px] border border-line bg-surface shadow-2xl animate-scale-in outline-none ${
          align === 'top' ? '' : 'my-auto'
        }`}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
