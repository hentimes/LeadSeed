/**
 * Detector de deriva entre el historial de migraciones y su espejo numerado.
 *
 * Cada migracion vive dos veces:
 *
 *   supabase/migrations/20260909000300_tarea_diaria_de_envios.sql   <- fuente
 *   sql/migrations/176_tarea_diaria_de_envios.sql                   <- espejo
 *
 * ## Cual manda, y por que es al reves de lo que decia el README
 *
 * Manda la de marca temporal. Hasta el 2026-09-10, `sql/README.md` se declaraba
 * "la fuente autorizada de SQL del proyecto" y no mencionaba siquiera que
 * existiera una segunda copia completa. Era falso para `migrations/`, por tres
 * motivos que no son opinables:
 *
 *  - es la unica que el CLI ejecuta (`supabase db push`)
 *  - es la unica que la base registra en `supabase_migrations.schema_migrations`
 *  - es la unica capaz de expresar el orden real: la carpeta numerada tiene DOS
 *    archivos `036` y dos huecos (122 y 123, reservados por `no-aplicadas/`).
 *    Un identificador que se repite no es un orden.
 *
 * Ademas hay testimonio escrito en el propio repo: las cabeceras de `090`, `091`
 * y `137` dicen que esas migraciones nacieron en la carpeta temporal, se
 * aplicaron a produccion desde ahi, y que el archivo numerado es una copia
 * retroactiva. Durante ese tiempo, leer `sql/migrations/` daba una foto
 * incompleta de la base y nadie tenia forma de notarlo.
 *
 * Ese es exactamente el modo en que fallo `form-leads` entre este repo y
 * `landing-gerow`, y que obligo a escribir la regla de dueño unico del §15.5.
 *
 * ## Que comprueba
 *
 *  1. que toda migracion de la fuente tenga espejo, y al reves
 *  2. que los sufijos sean unicos dentro de cada carpeta
 *  3. que el contenido coincida, normalizando finales de linea
 *  4. que el orden numerico del espejo respete el orden temporal de la fuente
 *  5. que nada de `no-aplicadas/` este en realidad aplicado
 *
 * ## Por que empareja por sufijo
 *
 * El sufijo (`tarea_diaria_de_envios.sql`) es lo unico comun a las dos carpetas
 * y hoy es unico en ambas. El prefijo no sirve: `036` apunta a dos archivos, y
 * la marca temporal no se deriva del numero. Emparejar por contenido tampoco:
 * cuatro pares divergen a proposito en sus comentarios.
 *
 * Si dos archivos comparten sufijo, el script falla sin intentar desempatar.
 * Elegir en silencio cual migracion cuenta es justo lo que este detector existe
 * para impedir.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = join(RAIZ, 'supabase', 'migrations');
const ESPEJO = join(RAIZ, 'sql', 'migrations');
const NO_APLICADAS = join(ESPEJO, 'no-aplicadas');

/**
 * Parejas donde el espejo diverge a proposito de la fuente.
 *
 * Aqui solo se acepta divergencia en COMENTARIOS: el SQL ejecutable se sigue
 * comparando entero y tiene que coincidir caracter a caracter. Mantener esta
 * lista corta: cada entrada es un sitio donde el detector deja de mirar.
 */
const DIVERGENCIAS_ACEPTADAS = new Map([
  [
    'form_progress_events_and_retiro_channel.sql',
    'El espejo lleva cabecera de trazabilidad: la migracion nacio en la fuente y se copio despues.',
  ],
  [
    'reset_capture_link_progress.sql',
    'El espejo lleva cabecera de trazabilidad: la migracion nacio en la fuente y se copio despues.',
  ],
  [
    'normalizar_nombres_en_blanco.sql',
    'El espejo lleva la nota de numeracion del 2026-08-30 que explica por que es la 137 y no la 130.',
  ],
  [
    'capture_link_last_visit_at.sql',
    'Titulo distinto y una referencia de ruta que apunta a la carpeta del otro arbol.',
  ],
]);

/**
 * Puntos donde el numero y la marca temporal ya se contradicen, y se congela.
 *
 * No se arreglan renumerando: son migraciones aplicadas, y la base las tiene
 * anotadas por su nombre temporal. Se declaran para que el detector siga
 * sirviendo en todo lo demas en vez de fallar siempre por lo mismo.
 */
const ORDEN_HISTORICO_ACEPTADO = new Set([
  'chat_message_admin_delete.sql',
  'normalizar_nombres_en_blanco.sql',
]);

/** Todo lo que sigue al primer `_`. Es la clave de emparejamiento. */
function sufijo(nombre) {
  const corte = nombre.indexOf('_');
  return corte === -1 ? nombre : nombre.slice(corte + 1);
}

/** Lo que va antes del primer `_`: `176` o `20260909000300`. */
function prefijo(nombre) {
  const corte = nombre.indexOf('_');
  return corte === -1 ? '' : nombre.slice(0, corte);
}

function migraciones(dir) {
  if (!existsSync(dir)) {
    console.error(`[check:migrations] No existe ${dir}.`);
    process.exit(1);
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name)
    .sort();
}

/**
 * Normaliza lo que no deberia contar como diferencia.
 *
 * El repo usa `* text=auto`, asi que en Windows el arbol de trabajo tiene CRLF
 * y en Linux LF. Comparar sin normalizar hace que este detector falle segun la
 * maquina, que es la peor forma de fallar.
 */
function normalizar(texto) {
  return texto
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n+$/, '\n');
}

/** Solo las sentencias: fuera comentarios de linea completa y lineas vacias. */
function soloSql(texto) {
  return normalizar(texto)
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.trim().startsWith('--'))
    .join('\n');
}

function indexarPorSufijo(nombres, problemas, etiqueta) {
  const indice = new Map();

  for (const nombre of nombres) {
    const clave = sufijo(nombre);
    const previo = indice.get(clave);
    if (previo) {
      problemas.push(
        `${etiqueta}: sufijo duplicado "${clave}"\n` +
          `    ${previo}\n` +
          `    ${nombre}\n` +
          '    El emparejamiento seria ambiguo. Renombra uno de los dos.',
      );
      continue;
    }
    indice.set(clave, nombre);
  }

  return indice;
}

function main() {
  const problemas = [];

  const nombresFuente = migraciones(FUENTE);
  const nombresEspejo = migraciones(ESPEJO);

  if (nombresFuente.length === 0) {
    console.error('[check:migrations] supabase/migrations no tiene ningun .sql.');
    process.exit(1);
  }

  const indiceFuente = indexarPorSufijo(nombresFuente, problemas, 'supabase/migrations');
  const indiceEspejo = indexarPorSufijo(nombresEspejo, problemas, 'sql/migrations');

  // 1. Migraciones aplicadas sin espejo legible.
  for (const [clave, nombre] of indiceFuente) {
    if (!indiceEspejo.has(clave)) {
      problemas.push(
        `sin espejo: supabase/migrations/${nombre}\n` +
          '    Esta en la fuente y no en sql/migrations. Leyendo solo la carpeta\n' +
          '    numerada es imposible saber que este cambio existe en la base.',
      );
    }
  }

  // 2. Espejos sin migracion real detras.
  for (const [clave, nombre] of indiceEspejo) {
    if (!indiceFuente.has(clave)) {
      problemas.push(
        `sin fuente: sql/migrations/${nombre}\n` +
          '    Esta en el espejo y no en supabase/migrations, asi que el CLI nunca\n' +
          '    la aplicara. Si hace falta, creala con `supabase migration new`.\n' +
          '    Si no debe aplicarse, va en sql/migrations/no-aplicadas/.',
      );
    }
  }

  // 3. Contenido.
  for (const [clave, nombreFuente] of indiceFuente) {
    const nombreEspejo = indiceEspejo.get(clave);
    if (!nombreEspejo) continue;

    const textoFuente = readFileSync(join(FUENTE, nombreFuente), 'utf8');
    const textoEspejo = readFileSync(join(ESPEJO, nombreEspejo), 'utf8');

    if (normalizar(textoFuente) === normalizar(textoEspejo)) continue;

    if (DIVERGENCIAS_ACEPTADAS.has(clave)) {
      // Se acepta que difieran los comentarios. El SQL, no.
      if (soloSql(textoFuente) !== soloSql(textoEspejo)) {
        problemas.push(
          `SQL divergente: supabase/migrations/${nombreFuente}\n` +
            `    vs sql/migrations/${nombreEspejo}\n` +
            '    Esta pareja tiene permiso para divergir en comentarios\n' +
            `    (${DIVERGENCIAS_ACEPTADAS.get(clave)})\n` +
            '    pero las sentencias tambien difieren, y eso no se acepta nunca.',
        );
      }
      continue;
    }

    problemas.push(
      `contenido divergente: supabase/migrations/${nombreFuente}\n` +
        `    vs sql/migrations/${nombreEspejo}\n` +
        '    Manda la fuente. Copia su contenido al espejo, o si la diferencia\n' +
        '    es un comentario deliberado, agregala a DIVERGENCIAS_ACEPTADAS en\n' +
        '    scripts/check-migrations-mirror.mjs junto con su motivo.',
    );
  }

  // 4. Orden. Recorriendo el espejo por numero, la marca temporal de su pareja
  //    no puede retroceder: si lo hace, las dos carpetas cuentan historias
  //    distintas sobre en que orden se aplico el esquema.
  const enOrdenDeEspejo = [...indiceEspejo.entries()]
    .filter(([clave]) => indiceFuente.has(clave))
    .sort((a, b) => a[1].localeCompare(b[1]));

  let tsPrevio = '';
  let espejoPrevio = '';
  for (const [clave, nombreEspejo] of enOrdenDeEspejo) {
    const ts = prefijo(indiceFuente.get(clave));
    if (tsPrevio && ts < tsPrevio && !ORDEN_HISTORICO_ACEPTADO.has(clave)) {
      problemas.push(
        `orden invertido: sql/migrations/${nombreEspejo} (${ts})\n` +
          `    va despues de ${espejoPrevio} (${tsPrevio}) por numero,\n` +
          '    pero antes por marca temporal. El orden real lo fija la fuente:\n' +
          '    aplicar el espejo por numero daria una secuencia distinta.',
      );
    }
    tsPrevio = ts;
    espejoPrevio = nombreEspejo;
  }

  // 5. `no-aplicadas/` tiene que seguir siendo cierto.
  if (existsSync(NO_APLICADAS)) {
    for (const nombre of migraciones(NO_APLICADAS)) {
      const clave = sufijo(nombre);
      if (indiceFuente.has(clave)) {
        problemas.push(
          `no-aplicadas miente: ${nombre}\n` +
            `    Existe como supabase/migrations/${indiceFuente.get(clave)}, asi que\n` +
            '    esta aplicada. Sacala de no-aplicadas/ y dale su numero.',
        );
      }
    }
  }

  if (problemas.length > 0) {
    console.error('[check:migrations] Deriva detectada:\n');
    for (const problema of problemas) console.error(`  - ${problema}`);
    console.error(
      '\nLa fuente es supabase/migrations (marca temporal): es la que el CLI aplica\n' +
        'y la que la base registra. sql/migrations es el espejo legible.\n' +
        'Ver sql/README.md y supabase/migrations/README.md.',
    );
    process.exit(1);
  }

  console.log(
    `[check:migrations] ${indiceFuente.size} migraciones, espejo al dia, orden coherente.`,
  );
}

main();
