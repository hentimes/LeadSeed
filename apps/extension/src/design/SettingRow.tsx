import type { InputHTMLAttributes, ReactNode } from 'react';
import { GroupLabel } from './Text';

/**
 * FILA DE AJUSTE
 *
 * Las cuarenta filas de Configuracion tienen que leerse como cuarenta
 * instancias del mismo objeto, no como cuarenta soluciones distintas. Antes lo
 * eran: la casilla de "modo compacto" era un `label` con `border-gray-50`, la
 * de una columna de la tabla era otra dentro de una rejilla, el cliente de
 * WhatsApp era un segmentado de dos botones dentro de una `Card`, las metas
 * eran `input` con `border-b` y foco azul, y los interruptores de comunidad
 * eran un `peer` con la cadena de clases escrita a mano.
 *
 * ## La regla que mata los puntos de corte fantasma
 *
 * **La fila no cambia de maquetacion con el ancho. Nunca.** Rotulo a la
 * izquierda, control a la derecha, a 288px y a 628.
 *
 * No es una preferencia estetica. Configuracion estaba llena de `sm:grid` y
 * `sm:flex-row`, y `sm:` arranca en 640px: en un panel lateral **esas ramas no
 * se han renderizado jamas**. La cabecera de la tabla de alertas y la de la
 * tabla de canales de correo llevan quien sabe cuanto sin verse, asi que sus
 * casillas salian sin rotulo. Una fila que no reordena no puede tener un punto
 * de corte que no dispara.
 *
 * La unica variante es `stacked`, y se elige **por el tipo de control, no por
 * el ancho**: si el control no cabe en 160px -un area de texto, el formulario
 * de bloqueo de agenda- baja a la linea siguiente, y baja igual a 288 que a
 * 628.
 */

interface SettingRowProps {
  label: ReactNode;
  /** Una linea, ~70 caracteres. Si el rotulo se explica solo, no lleva. */
  hint?: ReactNode;
  /** El control: un interruptor, un selector, un numero o un boton. Uno solo. */
  control?: ReactNode;
  /**
   * El control baja a su propia linea a ancho completo. Para los que no caben
   * en la banda derecha, no para pantallas estrechas.
   */
  stacked?: boolean;
  /** Distintivo a la derecha del rotulo: "PRO", "3 activos". */
  badge?: ReactNode;
  /** Contenido que cuelga de la fila: resultados, sub-filas, un formulario. */
  children?: ReactNode;
  className?: string;
}

export function SettingRow({
  label,
  hint,
  control,
  stacked = false,
  badge,
  children,
  className = '',
}: SettingRowProps) {
  return (
    <div className={`px-3 py-2.5 ${className}`}>
      <div className={`flex min-w-0 gap-3 ${stacked ? 'flex-col' : 'items-center justify-between'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-body font-medium text-ink">{label}</span>
            {badge}
          </div>
          {hint && <p className="truncate text-meta text-ink-muted">{hint}</p>}
        </div>
        {control && <div className={stacked ? 'w-full' : 'shrink-0'}>{control}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

/**
 * Grupo de filas: rotulo fuera, tarjeta con separadores dentro.
 *
 * El rotulo va **fuera** de la caja a proposito. Metido dentro, como hacia la
 * bandeja de tickets, una cabecera cuesta 56px de alto; fuera son 20. En una
 * pantalla con seis grupos eso es la diferencia entre caber y no caber.
 *
 * Los separadores los pone el contenedor con `divide-y`, no cada fila con su
 * `border-b`: asi la ultima fila no dibuja una linea suelta contra el borde de
 * la tarjeta, que es lo que se veia antes.
 */
export function SettingGroup({
  label,
  action,
  children,
  className = '',
}: {
  label?: ReactNode;
  /** Control opcional a la derecha del rotulo del grupo. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 ${className}`}>
      {(label || action) && (
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
          {label ? <GroupLabel className="truncate">{label}</GroupLabel> : <span />}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-md border border-line bg-surface divide-y divide-line">
        {children}
      </div>
    </section>
  );
}

/**
 * Interruptor.
 *
 * Existia dos veces escrito a mano -en los ajustes de comunidad de Cuenta, con
 * su cadena de `peer-checked:after:translate-x-full`, y como casilla normal en
 * Apariencia- para la misma idea: algo que se enciende y se apaga y se guarda
 * solo. Las casillas cuadradas se quedan para lo que se elige en lote (las
 * columnas de la tabla); esto es para lo que tiene dos estados y efecto
 * inmediato.
 *
 * La casilla real esta debajo con `sr-only`: conserva el foco, el teclado y el
 * nombre accesible, que un `div` pintado no tiene.
 */
export function Switch({
  label,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  /** Nombre accesible. No se pinta: el rotulo visible lo pone `SettingRow`. */
  label: string;
  className?: string;
}) {
  return (
    <label className={`relative inline-flex shrink-0 cursor-pointer items-center ${className}`}>
      <input {...rest} type="checkbox" aria-label={label} className="peer sr-only" />
      <span className="block h-5 w-9 rounded-full bg-surface-sunken transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-disabled:opacity-40" />
      <span className="pointer-events-none absolute left-[2px] top-[2px] h-4 w-4 rounded-full border border-line-strong bg-surface transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
