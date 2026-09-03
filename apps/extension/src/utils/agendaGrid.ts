/**
 * CALCULO DE LAS GRILLAS DE LA AGENDA
 *
 * Todo puro: recibe fechas, devuelve datos. Sin DOM, para que se pueda probar
 * sin montar nada.
 *
 * ## La zona horaria
 *
 * Se trabaja en **hora local del dispositivo**, que es lo que ya hace el 100%
 * del codigo existente (`toDateInputValue` en `useAgenda`, `comoFecha` en
 * `date.ts`).
 *
 * Vale decir lo que eso implica, porque no es obvio: `CalendarSettings` guarda
 * una `timezone` del negocio que HOY no se usa para mostrar nada. Si el
 * dispositivo esta en otra zona, una cita de las 23:30 puede dibujarse en el dia
 * siguiente. Ya pasaba antes en los campos de reprogramar; en una grilla se ve
 * mucho mas.
 *
 * No se mezcla aca: usar la zona del dispositivo para agrupar y la del negocio
 * para posicionar seria la via mas rapida a un bug irreproducible. Un solo
 * criterio, escrito.
 *
 * ## El cambio de hora
 *
 * El dia del cambio de horario tiene 23 o 25 horas. La grilla asume franjas de
 * igual alto, asi que ese dia una cita puede quedar corrida. Se acepta: es una
 * agenda de una persona, no un planificador industrial, y cubrirlo cuesta mas
 * de lo que rinde. Queda dicho para que nadie lo descubra como sorpresa.
 */

/** `aaaa-mm-dd` en hora local. Es la clave con la que se agrupa por dia. */
export function claveDeDia(valor: Date | string): string {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Los siete dias de la semana que contiene la fecha, de lunes a domingo. */
export function diasDeLaSemana(dentroDeLaSemana: Date): Date[] {
  const lunes = new Date(dentroDeLaSemana);
  // `getDay()` da 0 para domingo; se corre para que la semana arranque el lunes.
  const desplazamiento = (lunes.getDay() + 6) % 7;
  lunes.setDate(lunes.getDate() - desplazamiento);
  lunes.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return dia;
  });
}

/**
 * Las celdas de la grilla mensual: siempre 42, o sea seis semanas completas.
 *
 * Se completan con dias del mes anterior y del siguiente. Son 42 y no "las que
 * hagan falta" a proposito: con un numero variable de filas, la grilla cambia de
 * alto al pasar de mes y todo lo que esta debajo salta.
 */
export function diasDeLaGrillaMensual(anio: number, mes: number): Date[] {
  const primero = new Date(anio, mes, 1);
  // La grilla arranca el lunes de la semana en la que cae el dia 1.
  const inicio = diasDeLaSemana(primero)[0]!;

  return Array.from({ length: 42 }, (_, i) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    return dia;
  });
}

/** Agrupa por dia local. La clave es la misma de `claveDeDia`. */
export function agruparPorDia<T extends { startsAt: string }>(items: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();

  for (const item of items) {
    const clave = claveDeDia(item.startsAt);
    if (!clave) continue;

    const delDia = mapa.get(clave);
    if (delDia) delDia.push(item);
    else mapa.set(clave, [item]);
  }

  // Dentro de cada dia, por hora. La grilla los pinta en ese orden.
  for (const delDia of mapa.values()) {
    delDia.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  return mapa;
}

/** Cuantos minutos pasaron desde la medianoche local. */
export function minutosDesdeMedianoche(valor: Date | string): number {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 0;
  return fecha.getHours() * 60 + fecha.getMinutes();
}

/** Cuanto dura una cita, en minutos. Sin fin conocido se asumen 30. */
export function duracionEnMinutos(startsAt: string, endsAt?: string | null): number {
  const inicio = new Date(startsAt).getTime();
  if (Number.isNaN(inicio)) return 30;
  if (!endsAt) return 30;

  const fin = new Date(endsAt).getTime();
  if (Number.isNaN(fin) || fin <= inicio) return 30;

  return Math.round((fin - inicio) / 60000);
}

/** Mismo dia local. */
export function esElMismoDia(a: Date | string, b: Date | string): boolean {
  const claveA = claveDeDia(a);
  return claveA !== '' && claveA === claveDeDia(b);
}

/**
 * El rango que hay que pedirle al servidor para pintar un periodo.
 *
 * Con un colchon de una semana a cada lado: sin el, cada flecha de "mes
 * anterior" dispara una recarga y la grilla parpadea. Con el, moverse un mes
 * suele caer dentro de lo que ya se pidio.
 *
 * Devuelve `aaaa-mm-dd`, que es lo que espera `listMyAppointments`.
 */
export function rangoParaPeriodo(desde: Date, hasta: Date): { from: string; to: string } {
  const from = new Date(desde);
  from.setDate(from.getDate() - 7);

  const to = new Date(hasta);
  to.setDate(to.getDate() + 7);

  return { from: claveDeDia(from), to: claveDeDia(to) };
}
