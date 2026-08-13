/**
 * COLORES DE MARCA Y DE ESTADO, COMO CONSTANTES
 *
 * Estos son los unicos colores del sistema que **no cambian entre claro y
 * oscuro**. `tokens.css` lo dice explicitamente: en oscuro se redefinen las
 * superficies, el texto y los bordes, pero la marca y los colores de estado se
 * mantienen para no perder identidad.
 *
 * Que sean invariantes es justo lo que permite tenerlos aca como literales sin
 * mentir: un `var(--ls-danger)` y este `DANGER` valen lo mismo en los dos temas.
 * Con `--ls-surface` no se podria hacer esto, y por eso no esta.
 *
 * ¿Por que existe este archivo si ya existe `tokens.css`?
 *
 * Porque hay dos sitios que necesitan el color como **dato**, no como estilo, y
 * ninguno de los dos puede leer una variable CSS:
 *
 *  - `chrome.action.setBadgeBackgroundColor` corre en el service worker, donde
 *    no hay DOM del que leer nada.
 *  - Los colores que se guardan en la base (el de una lista, el de un estado de
 *    lead) viajan como texto y tienen que ser un valor concreto.
 *
 * Hasta el 2026-08-13 cada uno de esos sitios repetia el hexadecimal a mano, y
 * habia cinco copias de `#ef4444` sin nada que las mantuviera sincronizadas.
 *
 * REGLA: si cambias un valor aca, cambialo tambien en `tokens.css`. Son la
 * misma decision escrita en dos lenguajes, no dos decisiones.
 *
 * Esto NO es para estilos. En CSS y en clases de Tailwind se usa el token
 * (`var(--ls-danger)`, `text-state-danger`), que ademas respeta el tema.
 */
export const BRAND = {
  primary: '#6c4cf6',
  primaryHover: '#5b3ce0',
  primaryDeep: '#4a2bb5',
  primaryLight: '#8f85ff',
} as const;

export const STATE = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
} as const;
