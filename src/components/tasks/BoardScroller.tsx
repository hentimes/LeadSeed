import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../utils/icons';

/** Cuanto se desplaza al tocar una flecha, en pixeles. */
const SALTO = 160;

/**
 * DESPLAZAMIENTO HORIZONTAL, VISIBLE
 *
 * ## Por que existe
 *
 * El producto oculta los scrollbars en todo el CSS, asi que un contenedor con
 * desplazamiento lateral no anuncia nada: las columnas de la derecha
 * directamente no existen para quien mira, y no hay forma de llegar a ellas sin
 * rueda horizontal o gesto de trackpad.
 *
 * Aca el control se dibuja: dos flechas y, entre ellas, una barra propia que
 * ademas sirve de mapa -su largo dice cuanto del tablero se ve, y su posicion
 * donde estas-.
 *
 * ## La barra es un `range`, no un div
 *
 * Un `input[type=range]` trae gratis lo que costaria escribir: foco, flechas
 * del teclado, arrastre con el dedo y nombre accesible. Un div con `onPointer`
 * no lo tiene, y esta pantalla va camino a movil.
 *
 * ## Se esconde solo
 *
 * Si el contenido entra entero, el control no se pinta: un mando que no puede
 * mover nada es ruido, y con dos secciones el tablero entra sin desplazarse.
 */
export function BoardScroller({ children }: { children: ReactNode }) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [maximo, setMaximo] = useState(0);
  const [proporcionVisible, setProporcionVisible] = useState(1);

  /*
   * `ResizeObserver` y no un evento de `resize` de ventana: el panel lateral
   * cambia de ancho sin que la ventana cambie, que es justo el caso -lo
   * arrastras mas angosto y el tablero tiene que enterarse-.
   *
   * Vive en el componente y no en un hook por la frontera de capas: los hooks
   * del proyecto no pueden tocar `ResizeObserver`, pensando en React Native.
   */
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;

    const medir = () => {
      const sobrante = pista.scrollWidth - pista.clientWidth;
      setMaximo(Math.max(0, sobrante));
      setDesplazamiento(pista.scrollLeft);
      setProporcionVisible(pista.scrollWidth > 0 ? pista.clientWidth / pista.scrollWidth : 1);
    };

    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(pista);
    pista.addEventListener('scroll', medir, { passive: true });

    return () => {
      observador.disconnect();
      pista.removeEventListener('scroll', medir);
    };
  }, [children]);

  const irA = (x: number) => {
    pistaRef.current?.scrollTo({ left: x, behavior: 'smooth' });
  };

  const hayQueDesplazar = maximo > 1;

  return (
    <div className="flex flex-col gap-2">
      <div ref={pistaRef} className="-mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1">
        {children}
      </div>

      {hayQueDesplazar && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => irA(Math.max(0, desplazamiento - SALTO))}
            disabled={desplazamiento <= 0}
            title="Ver las columnas de la izquierda"
            aria-label="Ver las columnas de la izquierda"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40 [&_svg]:h-2.5 [&_svg]:w-2.5"
          >
            <Icon.ChevronLeft />
          </button>

          {/*
            El `background-size` dibuja el relleno recorrido, y el ancho del
            pulgar sale de cuanto del tablero se ve: con dos columnas de diez, el
            pulgar es corto: es la unica pista de cuanto falta.
          */}
          <input
            type="range"
            min={0}
            max={maximo}
            value={Math.min(desplazamiento, maximo)}
            onChange={(evento) => irA(Number(evento.target.value))}
            aria-label="Desplazar el tablero"
            style={{ ['--proporcion' as string]: `${Math.round(proporcionVisible * 100)}%` }}
            className="board-scroll-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken"
          />

          <button
            type="button"
            onClick={() => irA(Math.min(maximo, desplazamiento + SALTO))}
            disabled={desplazamiento >= maximo - 1}
            title="Ver las columnas de la derecha"
            aria-label="Ver las columnas de la derecha"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40 [&_svg]:h-2.5 [&_svg]:w-2.5"
          >
            <Icon.ChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
