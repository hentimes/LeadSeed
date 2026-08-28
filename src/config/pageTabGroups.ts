import type { Page } from '../types';

/**
 * GRUPOS DE PAGINAS CON BARRA HORIZONTAL
 *
 * Un grupo son varias paginas hermanas que comparten una barra de pestanas
 * arriba, en lugar de esconderse tras un submenu del rail.
 *
 * Nace de Mensajes: `send`, `templates` y `flows` vivian dentro de un
 * desplegable anclado al rail, con su velo, su gestion de foco y su panel de
 * 200px, para tres destinos. La barra los deja a la vista y a un toque, igual
 * que hizo Configuracion con sus seis secciones.
 *
 * ## Reglas para anadir un grupo
 *
 * Se escriben aqui y no en una conversacion, porque el riesgo de este patron
 * es que manana toda pagina quiera su barra:
 *
 *  1. Las paginas tienen que ser **pares**: mismo sustantivo, mutuamente
 *     excluyentes, sin orden entre ellas. `history` no es par de `send` -es un
 *     registro, no una accion hermana-.
 *  2. Entre **dos y cuatro**. Con cinco no cabe el texto en el panel estrecho,
 *     y a esa altura no es un grupo: es una seccion con pagina propia.
 *  3. Una pagina pertenece **como mucho a un** grupo.
 *  4. El grupo tiene una **entrada** obvia y unica (`landing`).
 *  5. Un grupo **sustituye** una entrada del rail, nunca anade una. El numero
 *     de entradas del rail no crece por tener grupos.
 *
 * Los rotulos y los iconos de cada pestana **no se declaran aqui**: salen del
 * `RouteDef` de `routes.ts`, que ya es la fuente de verdad y la que decide
 * ademas que funcionalidad hace falta para entrar.
 */
export interface PageTabGroupDef {
  id: string;
  /** Nombre del grupo: lo que dice el rail y la barra superior. */
  label: string;
  /** A donde lleva la entrada del rail. */
  landing: Page;
  pages: Page[];
}

export const pageTabGroups: PageTabGroupDef[] = [
  {
    id: 'messages',
    label: 'Mensajes',
    landing: 'send',
    pages: ['send', 'templates', 'flows'],
  },
];

/** El grupo al que pertenece una pagina, si pertenece a alguno. */
export function grupoDePagina(page: Page): PageTabGroupDef | undefined {
  return pageTabGroups.find((grupo) => grupo.pages.includes(page));
}
