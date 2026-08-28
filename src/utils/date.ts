/**
 * Formato unico de fechas y horas.
 *
 * Antes cada pantalla lo resolvia por su cuenta y convivian tres criterios:
 * `es-CL` en la mayoria, `es-ES` en el panel, y **sin idioma** en tres sitios
 * (comunidad, tickets de soporte y requerimientos). Ese ultimo caso no es una
 * inconsistencia cosmetica: sin idioma se usa el del navegador, asi que en un
 * equipo configurado en ingles `03-04-2026` se lee como 4 de marzo en una
 * pantalla y 3 de abril en la de al lado. La misma fecha, dos dias distintos.
 *
 * Aqui se fija `es-CL` para todo, que es lo que ya usaba la mayor parte.
 */

const IDIOMA = 'es-CL';

/** Lo que se muestra cuando no hay dato o el dato no es una fecha valida. */
const VACIO = '';

function comoFecha(valor: Date | string | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `19-08-2026`. */
export function formatearFecha(valor: Date | string | null | undefined): string {
  const d = comoFecha(valor);
  return d ? d.toLocaleDateString(IDIOMA) : VACIO;
}

/** `14:05`, en reloj de 24 horas. */
export function formatearHora(valor: Date | string | null | undefined): string {
  const d = comoFecha(valor);
  return d ? d.toLocaleTimeString(IDIOMA, { hour: '2-digit', minute: '2-digit', hour12: false }) : VACIO;
}

/** `19-08-2026 14:05`. */
export function formatearFechaHora(valor: Date | string | null | undefined): string {
  const d = comoFecha(valor);
  if (!d) return VACIO;
  return `${formatearFecha(d)} ${formatearHora(d)}`;
}

/** `19 ago 2026`, para cabeceras donde el numero solo queda seco. */
export function formatearFechaLarga(valor: Date | string | null | undefined): string {
  const d = comoFecha(valor);
  if (!d) return VACIO;
  return d.toLocaleDateString(IDIOMA, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * `ahora`, `hace 5 min`, `hace 3 h`, `hace 2 d`, y a partir de la semana la
 * fecha corta.
 *
 * Nace en la cabecera del detalle de usuario de Admin, donde la ultima
 * conexion se pintaba con `toLocaleString('es-CL')` entera: veintitantos
 * caracteres en una linea de 240px para un dato del que solo interesa si fue
 * hoy o hace un mes. Pasado el corte se devuelve la fecha, que a esa distancia
 * ya es mas informativa que "hace 47 dias".
 */
export function formatearTiempoRelativo(valor: Date | string | null | undefined): string {
  const d = comoFecha(valor);
  if (!d) return VACIO;

  const segundos = Math.floor((Date.now() - d.getTime()) / 1000);
  if (segundos < 60) return 'ahora';
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  if (segundos < 604800) return `hace ${Math.floor(segundos / 86400)} d`;
  return formatearFecha(d);
}
