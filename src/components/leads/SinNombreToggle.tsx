import { useMemo } from 'react';
import type { Lead } from '../../types';
import { IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible, SIN_NOMBRE } from '../../utils/leadDisplay';

/**
 * Mostrar u ocultar los leads sin nombre, en cualquier lista.
 *
 * La primera version era un chip rotulado "Ocultar sin nombre" y solo estaba en
 * dos listas. Se pidio que estuviera en todas y que no molestara, asi que pasa
 * a un boton de icono: ocupa lo mismo que cualquier otra accion de la barra y
 * no compite por atencion con lo que se esta mirando.
 *
 * El rotulo vive en el tooltip y **cambia con el estado**, diciendo ademas
 * cuantos leads hay detras: "Ocultar 158 leads sin nombre" cuando se ven, y
 * "Mostrar 158 leads sin nombre" cuando no. Un icono solo obliga a pulsarlo
 * para averiguar que hace; con la cifra dentro, la decision se toma antes de
 * pulsar.
 *
 * No se pinta si no hay ninguno que ocultar: un control que no hace nada es
 * ruido, y en la mayoria de las cuentas no habra leads sin nombre.
 */

/**
 * Cuantos leads de la coleccion no tienen nombre.
 *
 * Se pregunta a `nombreVisible`, que es la misma funcion que decide que pinta
 * la fila. Comprobar la cadena a mano dejaria pasar el nombre hecho de espacios
 * -que existe entre los leads importados- y el filtro discreparia de lo que se
 * ve en pantalla.
 */
export function contarSinNombre(leads: Array<Pick<Lead, 'name'>>): number {
  return leads.reduce((total, lead) => (nombreVisible(lead.name) === SIN_NOMBRE ? total + 1 : total), 0);
}

/** Si el lead debe verse con el filtro en su estado actual. */
export function pasaFiltroDeNombre(lead: Pick<Lead, 'name'>, ocultar: boolean): boolean {
  return ocultar ? nombreVisible(lead.name) !== SIN_NOMBRE : true;
}

/** El mismo calculo, aplicado a una coleccion. */
export function useLeadsConNombre<T extends Pick<Lead, 'name'>>(leads: T[], ocultar: boolean): T[] {
  return useMemo(
    () => (ocultar ? leads.filter((lead) => pasaFiltroDeNombre(lead, true)) : leads),
    [leads, ocultar],
  );
}

export default function SinNombreToggle({
  /** Cuantos leads sin nombre hay en la coleccion completa, no en la pagina. */
  count,
  ocultos,
  onToggle,
  className = '',
}: {
  count: number;
  ocultos: boolean;
  onToggle: () => void;
  className?: string;
}) {
  if (count === 0) return null;

  const plural = count === 1 ? 'lead sin nombre' : 'leads sin nombre';
  const etiqueta = ocultos ? `Mostrar ${count} ${plural}` : `Ocultar ${count} ${plural}`;

  return (
    <IconButton
      icon={ocultos ? <Icon.ViewOff /> : <Icon.View />}
      label={etiqueta}
      title={etiqueta}
      size="sm"
      onClick={onToggle}
      className={`${ocultos ? 'text-primary' : 'text-ink-muted'} ${className}`}
    />
  );
}
