/**
 * Como se muestra un lead en pantalla: nombre, nombre corto y telefono.
 *
 * Existe porque las siete listas de leads de la app respondian distinto a las
 * mismas tres preguntas, y el mismo lead se veia de forma diferente segun por
 * donde se mirara. Lo que se encontro el 2026-08-20 al inventariarlas:
 *
 * - **Tres textos para un lead sin nombre.** `'(sin nombre)'` en el modal de
 *   flujos, `'Sin nombre'` en los paneles de admin, y en las otras cuatro
 *   ninguno: una celda vacia, que ademas es silenciosa para un lector de
 *   pantalla. De los tres casos ese es el peor.
 * - **`shortName` escrito dos veces con reglas distintas**, y una de las dos
 *   estaba mal. Ver `nombreCorto`.
 * - **Cuatro reglas de enmascarado de telefono.** Ver `telefonoEnmascarado`.
 *
 * Ninguna de las tres funciones toca el DOM ni conoce React: son decisiones de
 * presentacion puras, y por eso se pueden probar sin montar nada.
 */

/**
 * Lo que se muestra cuando el lead no tiene nombre.
 *
 * Se eligio sin parentesis por dos razones. Un lector de pantalla en modo de
 * puntuacion completa lee "parentesis sin nombre parentesis", que es peor que
 * no decir nada; y el resto de los vacios del producto ya siguen esta forma
 * (`'Sin correo'` y `'Sin telefono'` en el selector de destinatarios).
 */
export const SIN_NOMBRE = 'Sin nombre';

/**
 * El nombre tal cual, o `SIN_NOMBRE` si no hay ninguno.
 *
 * Trata como vacio tanto el nulo y el indefinido como la cadena de solo
 * espacios: en la base hay leads importados cuyo nombre es `' '`, y dejar ese
 * espacio pasar pinta una fila que parece rota en vez de una que declara que
 * no tiene el dato.
 */
export function nombreVisible(nombre: string | null | undefined): string {
  if (typeof nombre !== 'string') return SIN_NOMBRE;
  const limpio = nombre.trim();
  return limpio.length > 0 ? limpio : SIN_NOMBRE;
}

/**
 * Abrevia un nombre chileno a "nombre + apellido paterno".
 *
 *   1-2 partes  Ana Soto                 -> Ana Soto
 *   3 partes    Juan Perez Soto          -> Juan Perez
 *   4+ partes   Juan Carlos Perez Soto   -> Juan Perez
 *
 * En Chile el nombre completo es uno o dos nombres de pila seguidos de dos
 * apellidos, paterno y luego materno. Con cuatro partes el apellido paterno es
 * la tercera, y por eso el salto de `parts[1]` a `parts[2]`.
 *
 * Esta regla convivia con otra, en la tabla de listas, que tomaba la primera
 * palabra y **la ultima**. Con cuatro partes eso devolvia "Juan Soto": el
 * apellido materno, que no es como se llama a nadie. No eran dos criterios
 * defendibles entre los que hubiera que elegir, era una correcta y otra
 * equivocada, asi que se conserva esta y se retira aquella.
 *
 * El nombre no se rellena aqui: quien quiera el respaldo compone con
 * `nombreVisible`. Separarlas deja abreviar un nombre que ya se sabe presente
 * sin volver a comprobarlo.
 */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(' ');
  if (partes.length === 3) return `${partes[0]} ${partes[1]}`;
  return `${partes[0]} ${partes[2]}`;
}

/**
 * Los ultimos cuatro digitos precedidos de puntos suspensivos: `...5874`.
 *
 * No es truncamiento visual sino recorte deliberado, y se conserva por dos
 * motivos independientes. En un panel de 360px un telefono completo compite
 * por el ancho con el nombre; y los ultimos digitos son justamente los que una
 * persona usa para distinguir dos contactos, porque el prefijo lo comparten
 * casi todos los numeros del pais.
 *
 * El corte va al principio a proposito. Un `text-overflow: ellipsis` de CSS
 * cortaria por el final y dejaria `+56981...`, que no distingue nada.
 *
 * Numeros de cuatro digitos o menos se devuelven enteros: anteponerles puntos
 * sugeriria que se oculta algo cuando ya se ve todo.
 */
export function telefonoEnmascarado(telefono: string): string {
  const limpio = telefono.trim();
  if (limpio.length <= 4) return limpio;
  return `...${limpio.slice(-4)}`;
}

/**
 * El telefono listo para pintar, enmascarado salvo que se pida revelarlo.
 *
 * La tabla de leads revela el numero completo cuando la fila esta seleccionada
 * y lo enmascara el resto del tiempo; el pipeline lo enmascara siempre. Las dos
 * conductas son la misma con `revelar` puesto de otra forma, asi que se expresan
 * con un solo parametro en vez de con dos funciones.
 */
export function telefonoVisible(telefono: string, revelar = false): string {
  return revelar ? telefono.trim() : telefonoEnmascarado(telefono);
}
