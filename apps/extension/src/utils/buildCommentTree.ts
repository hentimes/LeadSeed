import type { CommunityComment, CommunityCommentNode } from '../types/community';

/**
 * ARMA EL HILO DE COMENTARIOS
 *
 * La base devuelve una lista plana con `parent_id`; la interfaz necesita el
 * arbol. Vive aparte del componente porque es la parte con reglas que se pueden
 * equivocar en silencio -huerfanos, ciclos, orden dentro de la rama- y asi se
 * puede probar sin montar React.
 *
 * ## Que pasa con un huerfano
 *
 * Un comentario cuyo padre no esta en la lista se trata como raiz en vez de
 * descartarse. Pasa de verdad: el padre pudo borrarse de forma dura antes de
 * que existiera el borrado suave. Descartarlo haria desaparecer respuestas que
 * si existen.
 *
 * ## Ciclos
 *
 * No deberian existir -el trigger de la migracion 121 impide que un comentario
 * cuelgue de si mismo o supere el nivel 2- pero un ciclo dejaria el render en
 * un bucle infinito, que es la peor forma de fallar. Se cortan.
 */
export function buildCommentTree(flat: CommunityComment[]): CommunityCommentNode[] {
  const porId = new Map<string, CommunityCommentNode>();

  // Primera pasada: todos los nodos, sin colgar de nadie todavia. Hace falta
  // que existan antes de enlazar porque una respuesta puede venir en la lista
  // antes que su padre.
  for (const comentario of flat) {
    porId.set(comentario.id, { ...comentario, children: [] });
  }

  const raices: CommunityCommentNode[] = [];

  for (const comentario of flat) {
    const nodo = porId.get(comentario.id);
    if (!nodo) continue;

    const padre = comentario.parent_id ? porId.get(comentario.parent_id) : undefined;

    if (!padre || padre.id === nodo.id || esDescendiente(nodo, padre)) {
      raices.push(nodo);
      continue;
    }

    padre.children.push(nodo);
  }

  return raices;
}

/** `true` si `posible` cuelga de `nodo`; corta ciclos antes de enlazar. */
function esDescendiente(nodo: CommunityCommentNode, posible: CommunityCommentNode): boolean {
  const pendientes = [...nodo.children];

  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    if (!actual) break;
    if (actual.id === posible.id) return true;
    pendientes.push(...actual.children);
  }

  return false;
}

/**
 * Cuenta el hilo entero, no solo el primer nivel.
 *
 * El contador que se ve junto a la publicacion tiene que incluir las
 * respuestas: "3 comentarios" cuando hay tres raices y ocho respuestas es
 * mentira.
 */
export function contarComentarios(nodos: CommunityCommentNode[]): number {
  return nodos.reduce((total, nodo) => total + 1 + contarComentarios(nodo.children), 0);
}
