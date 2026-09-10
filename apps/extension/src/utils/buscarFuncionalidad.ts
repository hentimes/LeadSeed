import type { Feature } from '../types';

/**
 * Buscar una funcionalidad del catalogo.
 *
 * ## Por que busca tambien por identificador
 *
 * El caso que lo motiva: la funcionalidad del panel se llama "Panel" y su
 * clave es `module:dashboard`. Quien la busca escribiendo "dashboard" -que es
 * como se llama la seccion en el rail y como la nombra medio equipo- no
 * encontraba nada, y la conclusion razonable era que no estaba en el catalogo.
 *
 * Pasa siempre que el nombre visible y la clave divergen, que es lo normal en
 * cuanto alguien renombra algo. Buscar por los dos hace que el catalogo sea
 * encontrable por cualquiera de los dos vocabularios.
 *
 * Tambien mira la descripcion y la categoria: "embudo" tiene que encontrar los
 * reportes aunque la palabra solo salga ahi.
 *
 * ## Sin tildes y sin mayusculas
 *
 * Se compara normalizado en los dos lados. Quien busca "analisis" tiene que
 * encontrar "Análisis": exigir la tilde para encontrar algo es exigir saber
 * como se escribio.
 */

/** Minusculas y sin tildes, para comparar. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra por lo escrito. Con la busqueda vacia devuelve todo, que es lo que
 * hace que el buscador se pueda dejar puesto sin esconder nada.
 *
 * Cada palabra tiene que aparecer en algun sitio, no todas en el mismo: buscar
 * "panel reportes" encuentra lo que sea del panel Y de reportes, que es como
 * se busca cuando no recuerdas el nombre exacto.
 */
export function buscarFuncionalidades(features: Feature[], busqueda: string): Feature[] {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return features;

  return features.filter((feature) => {
    const donde = normalizar(
      [feature.name, feature.id, feature.description ?? '', feature.category ?? ''].join(' '),
    );
    return palabras.every((palabra) => donde.includes(palabra));
  });
}
