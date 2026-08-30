import type { ReactNode } from 'react';
import { Panel } from './Surface';
import { SectionHeader } from './PageShell';

/**
 * Una seccion desplegable.
 *
 * Nacio en la ficha de usuario de Admin y la usa tambien Configuracion, que
 * llega al mismo sitio por otro camino: no cabe todo a la vez en un panel de
 * 300px, y casi nada de lo que hay se toca en la misma visita.
 *
 * ## Por que acordeon y no otra fila de pestanas
 *
 * El detalle tenia ocho pestanas en pastillas de colores distintos. A 312px de
 * ancho util no caben ni cuatro, y la solucion que habia -dejar que se
 * desbordaran- obligaba a hacer scroll horizontal con la rueda del raton.
 *
 * Las alternativas y por que no:
 *
 *  - **Pestanas de solo icono**, como el Dashboard. Serian dos barras de
 *    subrayado identicas a tres centimetros una de otra, y "Licencias",
 *    "Datos" y "Actividad" no tienen icono que se adivine sin texto.
 *  - **Un desplegable**. Entierra los avisos: el motivo numero uno para abrir
 *    un usuario es que tiene mensajes sin leer, y un `<select>` cerrado no
 *    puede ensenar donde esta la novedad.
 *
 * El acordeon deja el rotulo completo y su cifra siempre a la vista, se
 * comporta igual a 312 que a 652px, y no necesita ninguna regla de corte.
 *
 * ## Una abierta a la vez
 *
 * Lo decide el padre. Con dos abiertas el alto pasa de los cuatro mil pixeles
 * y se pierde el hilo; ademas cada seccion carga sus datos al abrirse, asi que
 * mantener varias vivas multiplica las consultas sin que nadie las mire.
 */
export function Section({
  id,
  icon,
  title,
  badge,
  isOpen,
  onToggle,
  flush = false,
  children,
}: {
  /** Base del `id` que enlaza el boton con su contenido. */
  id?: string;
  /** Opcional: dentro de un grupo que ya lleva rotulo, el chip sobra. */
  icon?: ReactNode;
  title: string;
  /** Cifra de novedades, visible este abierta o cerrada. */
  badge?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  /**
   * Sin borde ni radio propios: la seccion se apoya en el contenedor.
   *
   * Para cuando ya hay una caja alrededor. Los tipos de formulario de
   * Configuracion viven dentro de una `Section` que a su vez vive dentro de
   * una `Card`: con borde propio serian tres marcos anidados, y en un panel de
   * 300px cada marco cuesta ancho util.
   */
  flush?: boolean;
  children: ReactNode;
}) {
  // Sin `id` propio se deriva del titulo: dos secciones distintas de la misma
  // pantalla no comparten rotulo.
  const idContenido = `seccion-${(id ?? title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className={flush ? '' : 'overflow-hidden rounded-md border border-line bg-surface'}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={idContenido}
        className="flex min-h-[44px] w-full items-center px-3 py-2 text-left transition-colors hover:bg-surface-hover"
      >
        <SectionHeader
          className="w-full"
          icon={icon}
          title={title}
          actions={
            <>
              {badge}
              <span
                aria-hidden="true"
                className={`text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </>
          }
        />
      </button>

      {isOpen && (
        <div id={idContenido} className={`border-t border-line ${flush ? 'p-2' : 'p-3'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Bloque de contenido dentro de una seccion abierta.
 *
 * Existe para que "Tiempo por seccion", "Con quien habla" y "Desempeno como
 * helper" -que antes eran tres pestanas- se lean como tres partes de
 * Actividad y no como tres pantallas apiladas por accidente.
 */
export function Block({
  title,
  count,
  children,
}: {
  title: string;
  count?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="truncate text-micro font-bold uppercase tracking-wide text-ink-secondary">{title}</h4>
        {count !== undefined && <span className="shrink-0 text-micro tabular-nums text-ink-muted">{count}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * Aviso en linea.
 *
 * Sustituye a los `alert('Error: ...')` de Admin. Un dialogo del navegador
 * borra el contexto donde ocurrio el fallo, que es justo lo que hace falta
 * ver; ademas bloquea el hilo y no se puede copiar el texto.
 */
export function Notice({
  tone = 'danger',
  children,
  onDismiss,
}: {
  tone?: 'danger' | 'success' | 'warning' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <Panel tone={tone} className="flex items-start justify-between gap-2">
      <p className="min-w-0 text-micro font-medium">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </Panel>
  );
}
