/**
 * Calcula a donde debe ir el foco cuando se pulsa Tab dentro de un dialogo.
 *
 * Devuelve `null` cuando no hay que intervenir y el navegador puede seguir con
 * su comportamiento normal.
 *
 * Vive en `utils/` y **no toca el DOM a proposito**: recibe la lista de
 * elementos ya resuelta y solo decide indices. Lo que si necesita el navegador
 * -encontrar que es enfocable- vive en la capa de componentes, que es la unica
 * que puede tocarlo. Asi esta parte se puede probar sin montar nada, que es lo
 * que importa: el ciclo del foco es logica que parece obvia y falla en los
 * extremos.
 *
 * Los elementos se tipan como `HTMLElement` porque es solo un tipo, no una
 * referencia en tiempo de ejecucion.
 */
export function siguienteFoco(
  focusables: HTMLElement[],
  activo: Element | null,
  haciaAtras: boolean
): HTMLElement | null {
  if (focusables.length === 0) return null;

  const primero = focusables[0]!;
  const ultimo = focusables[focusables.length - 1]!;

  // Con un solo control, Tab no tiene a donde ir: se queda donde esta.
  if (focusables.length === 1) return primero;

  if (haciaAtras && activo === primero) return ultimo;
  if (!haciaAtras && activo === ultimo) return primero;

  // El foco esta fuera de la lista porque el usuario venia de la pagina de
  // atras: se trae al borde que corresponda.
  if (!focusables.includes(activo as HTMLElement)) return haciaAtras ? ultimo : primero;

  // A mitad de la lista no hay nada que corregir.
  return null;
}
