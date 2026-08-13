/**
 * Detector de clases CSS muertas.
 *
 * Motivo: el 2026-08-13 aparecio en el modal de soporte un cuadrado en blanco
 * donde deberia haber un icono. La causa era la clase
 * `dark:backdrop-blur-md/20`, que no existe: un barrido de modo oscuro habia
 * insertado clases en medio de `bg-white/20` y dejo el `/20` pegado al sitio
 * equivocado. Tailwind no avisa de eso. Simplemente no genera nada, y la clase
 * queda ahi sin hacer nada hasta que alguien nota el hueco a ojo.
 *
 * Buscando esa aparecieron dos mas del mismo barrido, `animate-fadeIn` en
 * cuatro paneles de admin cuando el CSS define `animate-fade-in`, y
 * `custom-scrollbar`, usada en cuatro sitios y definida en ninguno.
 *
 * ## Como funciona
 *
 * Compara las clases que aparecen en el codigo contra las que Tailwind
 * realmente emitio en el CSS compilado. Si una clase se usa pero no genera
 * ninguna regla, o esta mal escrita o no existe.
 *
 * Es deliberadamente empirico: no reimplementa la gramatica de Tailwind, que
 * cambia entre versiones y admite valores arbitrarios. Le pregunta al build.
 *
 * ## Requisito
 *
 * Necesita un `dist/` reciente. Si el CSS compilado esta desfasado el
 * resultado no vale, asi que comprueba que exista y avisa si no.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const DIST = join(RAIZ, 'dist', 'assets');
const SRC = join(RAIZ, 'src');

/**
 * Clases que se usan a proposito sin generar CSS.
 *
 * Mantener esta lista corta y justificada: cada entrada es una clase que el
 * navegador ignora, asi que si crece sin motivo el detector deja de servir.
 */
const PERMITIDAS = new Map([
  ['dark', 'La agrega el propio codigo para alternar el tema, no para estilar.'],

  // --- Deuda conocida: opacidad sobre un color propio ---
  //
  // Los colores del sistema estan definidos en tailwind.config.js como
  // `var(--ls-primary)`, y esas variables guardan un hexadecimal. El modificador
  // de opacidad de Tailwind (`/25`) necesita poder inyectar el canal alfa, cosa
  // que no puede hacer sobre un `var()` opaco, asi que descarta la clase entera
  // en vez de avisar.
  //
  // Consecuencia: TODA opacidad sobre un color propio no hace nada hoy, incluida
  // la de las primitivas Badge, Surface y Button. Arreglarlo hace aparecer
  // bordes y fondos donde ahora no hay ninguno, o sea que cambia la apariencia y
  // necesita aprobacion. Registrado en el roadmap, capitulo 13.8.
  //
  // Estas entradas se retiran cuando se arregle la causa, no una por una.
  ['bg-primary/10', 'opacidad sobre color propio'],
  ['dark:bg-primary/20', 'opacidad sobre color propio'],
  ['hover:border-primary/40', 'opacidad sobre color propio'],
  ['border-state-success/25', 'opacidad sobre color propio'],
  ['border-state-warning/25', 'opacidad sobre color propio'],
  ['border-state-danger/25', 'opacidad sobre color propio'],
  ['border-state-info/25', 'opacidad sobre color propio'],
]);

/** Quita comentarios: lo que se documenta no es lo que se aplica. */
function sinComentarios(codigo) {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function archivos(dir, ext, acc = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, ext, acc);
    else if (ext.some((e) => nombre.endsWith(e))) acc.push(ruta);
  }
  return acc;
}

/**
 * Escapa una clase igual que hace Tailwind al escribir el selector:
 * `dark:bg-slate-800/80` pasa a `dark\:bg-slate-800\/80`.
 */
function comoSelector(clase) {
  return clase.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
}

/** Desde `inicio` (que apunta a un `{`), indice del `}` que lo cierra. */
function finDeLlave(codigo, inicio) {
  let nivel = 0;
  for (let i = inicio; i < codigo.length; i++) {
    if (codigo[i] === '{') nivel++;
    else if (codigo[i] === '}') {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

/**
 * Trozos de codigo de los que salen clases: el valor de cada `className`, y
 * en las primitivas del sistema de diseno tambien el fichero entero, porque
 * ahi las clases viven en constantes (`VARIANTS`, `SIZES`) y no en el JSX.
 *
 * Acotar al valor exacto del `className` importa: una ventana generosa
 * alrededor arrastra literales vecinos y el detector empieza a reportar
 * `mailto:`, `es-CL` o `cubic-bezier(0.4,` como si fueran clases.
 */
function trozosConClases(codigo, ruta) {
  const trozos = [];
  const re = /className\s*=\s*/g;
  let m;

  while ((m = re.exec(codigo))) {
    const inicioValor = m.index + m[0].length;
    const primerCaracter = codigo[inicioValor];

    if (primerCaracter === '{') {
      const fin = finDeLlave(codigo, inicioValor);
      if (fin !== -1) {
        trozos.push({ base: inicioValor, texto: codigo.slice(inicioValor, fin + 1), soloListas: false });
      }
    } else if (primerCaracter === '"' || primerCaracter === "'") {
      const cierre = codigo.indexOf(primerCaracter, inicioValor + 1);
      if (cierre !== -1) {
        trozos.push({ base: inicioValor, texto: codigo.slice(inicioValor, cierre + 1), soloListas: false });
      }
    }
  }

  if (ruta.replace(/\\/g, '/').includes('/src/design/')) {
    // `soloListas`: aqui solo cuentan los literales con dos o mas tokens, que
    // son listas de clases. Un literal de una palabra suele ser el nombre de
    // una variante ('ghost-danger'), no una clase.
    trozos.push({ base: 0, texto: codigo, soloListas: true });
  }

  return trozos;
}

function clasesDeArchivo(ruta) {
  const codigo = sinComentarios(readFileSync(ruta, 'utf-8'));
  const encontradas = new Map();

  for (const { base, texto, soloListas } of trozosConClases(codigo, ruta)) {
    for (const lit of texto.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
      const bruto = (lit[1] ?? lit[2] ?? lit[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
      const tokens = bruto.split(/\s+/).filter(Boolean);
      if (!tokens.length) continue;
      if (soloListas && tokens.length < 2) continue;

      for (const clase of tokens) {
        if (clase.length > 120) continue;
        if (!/^[a-z]/.test(clase)) continue;
        if (!/^[a-z0-9:_[\]().,/%!<>=+*&#-]+$/i.test(clase)) continue;
        if (!/[-:[]/.test(clase)) continue; // una palabra suelta no es una clase util
        if (!encontradas.has(clase)) {
          encontradas.set(clase, codigo.slice(0, base + lit.index).split('\n').length);
        }
      }
    }
  }

  return encontradas;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[check:classes] No hay dist/. Ejecuta `npm run build` antes.');
    process.exit(1);
  }

  const css = readdirSync(DIST)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(DIST, f), 'utf-8'))
    .join('\n');

  if (!css.trim()) {
    console.error('[check:classes] dist/assets no tiene ningun CSS.');
    process.exit(1);
  }

  const muertas = [];
  let revisadas = 0;

  for (const ruta of archivos(SRC, ['.tsx', '.ts'])) {
    if (/\.test\.tsx?$/.test(ruta)) continue;
    for (const [clase, linea] of clasesDeArchivo(ruta)) {
      if (PERMITIDAS.has(clase)) continue;
      revisadas++;
      if (!css.includes('.' + comoSelector(clase))) {
        muertas.push({ archivo: relative(RAIZ, ruta).replace(/\\/g, '/'), linea, clase });
      }
    }
  }

  if (muertas.length === 0) {
    console.log(`[check:classes] ${revisadas} clases revisadas, todas generan CSS.`);
    return;
  }

  console.error(`[check:classes] ${muertas.length} clases no generan ninguna regla CSS:\n`);
  for (const { archivo, linea, clase } of muertas) {
    console.error(`  ${archivo}:${linea}  ${clase}`);
  }
  console.error(
    '\nUna clase que no genera CSS no hace nada. Suele ser un error de escritura,\n' +
      'o una clase que quedo partida al editar (un `/20` que acabo pegado al utility\n' +
      'equivocado). Si alguna es intencional, agregala a PERMITIDAS en\n' +
      'scripts/check-tailwind-classes.mjs junto con su motivo.',
  );
  process.exit(1);
}

main();
