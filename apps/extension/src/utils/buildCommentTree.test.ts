import { describe, expect, it } from 'vitest';
import { buildCommentTree, contarComentarios } from './buildCommentTree';
import type { CommunityComment } from '../types/community';

function comentario(id: string, parentId: string | null = null): CommunityComment {
  return {
    id,
    post_id: 'post',
    author_id: 'ana',
    body: id,
    created_at: '2026-08-26T10:00:00',
    parent_id: parentId,
  };
}

describe('buildCommentTree', () => {
  it('devuelve una lista vacia para una entrada vacia', () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it('deja como raices los comentarios sin padre', () => {
    const arbol = buildCommentTree([comentario('a'), comentario('b')]);
    expect(arbol.map((n) => n.id)).toEqual(['a', 'b']);
    expect(arbol.every((n) => n.children.length === 0)).toBe(true);
  });

  it('cuelga una respuesta de su padre', () => {
    const arbol = buildCommentTree([comentario('a'), comentario('b', 'a')]);
    expect(arbol).toHaveLength(1);
    expect(arbol[0]?.children.map((n) => n.id)).toEqual(['b']);
  });

  it('arma tres niveles', () => {
    const arbol = buildCommentTree([
      comentario('a'),
      comentario('b', 'a'),
      comentario('c', 'b'),
    ]);

    expect(arbol[0]?.children[0]?.children.map((n) => n.id)).toEqual(['c']);
  });

  it('enlaza aunque la respuesta venga antes que su padre', () => {
    const arbol = buildCommentTree([comentario('b', 'a'), comentario('a')]);
    expect(arbol).toHaveLength(1);
    expect(arbol[0]?.id).toBe('a');
    expect(arbol[0]?.children.map((n) => n.id)).toEqual(['b']);
  });

  /*
   * Un padre que ya no esta pasa de verdad: se pudo borrar de forma dura antes
   * de que existiera el borrado suave. Perder la respuesta seria peor que
   * mostrarla un nivel mas arriba.
   */
  it('trata como raiz al huerfano en vez de descartarlo', () => {
    const arbol = buildCommentTree([comentario('b', 'no-existe')]);
    expect(arbol.map((n) => n.id)).toEqual(['b']);
  });

  it('no se cuelga si un comentario dice ser su propio padre', () => {
    const arbol = buildCommentTree([comentario('a', 'a')]);
    expect(arbol.map((n) => n.id)).toEqual(['a']);
  });

  it('corta un ciclo entre dos comentarios', () => {
    const arbol = buildCommentTree([comentario('a', 'b'), comentario('b', 'a')]);
    // No importa cual quede de raiz; importa que termine y no pierda ninguno.
    expect(contarComentarios(arbol)).toBe(2);
  });

  it('conserva el orden de entrada entre hermanos', () => {
    const arbol = buildCommentTree([
      comentario('a'),
      comentario('a1', 'a'),
      comentario('a2', 'a'),
    ]);

    expect(arbol[0]?.children.map((n) => n.id)).toEqual(['a1', 'a2']);
  });

  it('no muta los comentarios que recibe', () => {
    const entrada = [comentario('a'), comentario('b', 'a')];
    buildCommentTree(entrada);
    expect(entrada[0]).not.toHaveProperty('children');
  });
});

describe('contarComentarios', () => {
  it('cuenta el hilo entero, no solo las raices', () => {
    const arbol = buildCommentTree([
      comentario('a'),
      comentario('a1', 'a'),
      comentario('a2', 'a'),
      comentario('b'),
    ]);

    expect(arbol).toHaveLength(2);
    expect(contarComentarios(arbol)).toBe(4);
  });

  it('devuelve cero para un arbol vacio', () => {
    expect(contarComentarios([])).toBe(0);
  });
});
