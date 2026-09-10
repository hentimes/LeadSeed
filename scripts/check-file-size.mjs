/**
 * Guarda del umbral de tamano de archivo.
 *
 * Motivo: el §41 del plan de arquitectura pide "plan de extraccion al tocarlo"
 * para todo archivo sobre 500 lineas. La auditoria CONTROL del 2026-09-10
 * encontro trece archivos por encima, cinco tocados el dia anterior, y ningun
 * plan escrito en ninguna parte.
 *
 * La causa no fue descuido: era la unica regla estructural del proyecto sin
 * guarda automatica. Las que si tienen script -`check:classes`,
 * `check:functions`, `audit-dark-gaps`- se sostienen solas, y esta se
 * incumplia sin que nada lo delatara.
 *
 * ## Como funciona, y por que no falla con los trece de hoy
 *
 * Poner el proyecto en verde exigiria refactorizar trece archivos de golpe, que
 * es justo el refactor abierto que el §12 de CONTROL prohibe. Asi que la guarda
 * no compara contra 500 a secas: compara contra una linea base versionada en
 * `file-size-baseline.json` y solo falla en dos casos.
 *
 *  - un archivo de la linea base CRECIO
 *  - aparecio un archivo NUEVO sobre el umbral, que nadie declaro
 *
 * El numero de cada archivo solo puede ir hacia abajo. Cada extraccion del plan
 * baja su linea base, y cuando llega a 500 el archivo sale de la lista.
 *
 * ## Como se actualiza la linea base
 *
 * Con `npm run check:file-size -- --actualizar`. Se ejecuta DESPUES de una
 * extraccion real, nunca para silenciar un crecimiento: para eso esta el
 * mensaje de error, que dice exactamente eso.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, dirname } from 'node:path';

// Se resuelve desde la ubicacion del script y no desde `process.cwd()` para que
// dé igual desde donde se lance, igual que los otros dos checks.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'apps', 'extension', 'src');
const BASELINE = join(dirname(fileURLToPath(import.meta.url)), 'file-size-baseline.json');

/** Umbral del §41: por encima de esto hace falta plan de extraccion. */
const UMBRAL = 500;

/** Documento donde vive el plan de cada archivo que supera el umbral. */
const PLAN = 'docs/architecture/plan-extraccion-archivos-grandes.md';

/**
 * Las pruebas quedan fuera a proposito.
 *
 * Un archivo de pruebas largo no es deuda de la misma clase: no lo lee nadie
 * para entender el sistema, y partirlo suele empeorar la trazabilidad entre el
 * caso y lo que prueba.
 */
function esFuente(nombre) {
  if (!/\.(ts|tsx)$/.test(nombre)) return false;
  if (/\.test\.(ts|tsx)$/.test(nombre)) return false;
  if (/\.d\.ts$/.test(nombre)) return false;
  return true;
}

function recorrer(dir, encontrados = []) {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      recorrer(ruta, encontrados);
      continue;
    }
    if (!esFuente(entrada)) continue;

    const lineas = readFileSync(ruta, 'utf8').split('\n').length;
    if (lineas > UMBRAL) {
      encontrados.push({ archivo: relative(RAIZ, ruta).replace(/\\/g, '/'), lineas });
    }
  }
  return encontrados;
}

function leerBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  const actualizar = process.argv.includes('--actualizar');
  const actuales = recorrer(SRC).sort((a, b) => b.lineas - a.lineas);

  if (actualizar) {
    const nueva = Object.fromEntries(actuales.map(({ archivo, lineas }) => [archivo, lineas]));
    writeFileSync(BASELINE, `${JSON.stringify(nueva, null, 2)}\n`, 'utf8');
    console.log(
      `[check:file-size] Linea base actualizada: ${actuales.length} archivos sobre ${UMBRAL} lineas.`,
    );
    return;
  }

  const base = leerBaseline();
  const crecidos = [];
  const nuevos = [];

  for (const { archivo, lineas } of actuales) {
    const previo = base[archivo];
    if (previo === undefined) {
      nuevos.push({ archivo, lineas });
      continue;
    }
    if (lineas > previo) {
      crecidos.push({ archivo, lineas, previo });
    }
  }

  if (crecidos.length === 0 && nuevos.length === 0) {
    const bajados = actuales.filter(({ archivo, lineas }) => lineas < (base[archivo] ?? lineas));
    const nota = bajados.length > 0 ? `, ${bajados.length} mas cortos que su linea base` : '';
    console.log(
      `[check:file-size] ${actuales.length} archivos sobre ${UMBRAL} lineas, ninguno crecio${nota}.`,
    );
    return;
  }

  if (nuevos.length > 0) {
    console.error(
      `[check:file-size] ${nuevos.length} archivo(s) superan las ${UMBRAL} lineas sin plan declarado:\n`,
    );
    for (const { archivo, lineas } of nuevos) {
      console.error(`  ${archivo}  ${lineas} lineas`);
    }
    console.error(
      `\nEl §41 del plan de arquitectura pide plan de extraccion al tocar un archivo\n` +
        `sobre ${UMBRAL} lineas. Escribe que pieza sale primero y a donde va en\n` +
        `${PLAN}, y despues corre\n` +
        `\`npm run check:file-size -- --actualizar\` para fijar la linea base.\n`,
    );
  }

  if (crecidos.length > 0) {
    console.error(`[check:file-size] ${crecidos.length} archivo(s) crecieron:\n`);
    for (const { archivo, lineas, previo } of crecidos) {
      console.error(`  ${archivo}  ${previo} -> ${lineas} lineas  (+${lineas - previo})`);
    }
    console.error(
      `\nEstos archivos ya estaban sobre el umbral y su plan de extraccion esta\n` +
        `escrito en ${PLAN}.\n` +
        `La linea base solo baja: se actualiza DESPUES de extraer, no para dejar\n` +
        `pasar un crecimiento. Si el cambio es imprescindible, saca antes la pieza\n` +
        `que el plan ya tiene decidida para ese archivo.\n`,
    );
  }

  process.exit(1);
}

main();
