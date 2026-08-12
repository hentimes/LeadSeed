#!/usr/bin/env node
/**
 * Detector de deriva de propiedad de Edge Functions.
 *
 * LeadSeed y `landing-gerow` comparten el mismo proyecto Supabase, asi que un
 * `supabase functions deploy` desde el repo equivocado sobrescribe produccion
 * sin avisar. Eso ya paso con `form-leads` (ver AUDITORIA_CONTROL_2026-08-11) y
 * con `form-progress`, que estuvo desplegado desde un arbol sin commitear.
 *
 * El protocolo 15.5 fija la regla de dueño unico, pero una regla escrita no
 * impide un deploy. Esto tampoco lo impide: lo vuelve visible, que es lo unico
 * que se puede garantizar desde este lado.
 *
 * Comprueba dos cosas contra el proyecto real:
 *
 * 1. que toda funcion desplegada tenga su source en este repo
 * 2. que `verify_jwt` desplegado coincida con lo declarado en config.toml
 *
 * El punto 2 no es decorativo: diez de las doce funciones dependen de
 * `verify_jwt = false`, y desplegarlas sin ese valor las rompe en el acto.
 *
 * Uso: npm run check:functions
 *
 * Requiere un CLI de Supabase enlazado al proyecto. Si no lo esta, sale con
 * codigo 0 y un aviso: no queremos que el CI de una maquina sin credenciales
 * falle por algo que no puede comprobar.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lee los bloques `[functions.<slug>] verify_jwt = <bool>` de config.toml. */
function readDeclaredConfig() {
  const toml = readFileSync(join(repoRoot, 'supabase', 'config.toml'), 'utf8');
  const declared = new Map();

  const blocks = toml.matchAll(
    /^\[functions\.([a-z0-9-]+)\]\s*\n(?:[^[]*?^\s*verify_jwt\s*=\s*(true|false))?/gim,
  );

  for (const [, slug, verifyJwt] of blocks) {
    declared.set(slug, verifyJwt === undefined ? undefined : verifyJwt === 'true');
  }

  return declared;
}

function listDeployedFunctions() {
  // `shell: true` es necesario en Windows: `npx` es un .cmd y execFile no lo
  // resuelve. El comando es fijo, no lleva entrada del usuario.
  const raw = execSync('npx supabase functions list --output json', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const parsed = JSON.parse(raw);

  // El CLI cambia de forma segun el flag: `--output json` devuelve un array
  // plano y sin flag devuelve `{ functions: [...] }`. Se aceptan las dos, y se
  // falla si no llega ninguna, porque una lista vacia silenciosa convertiria
  // este detector en un "todo bien" permanente.
  const functions = Array.isArray(parsed) ? parsed : (parsed.functions ?? []);

  if (functions.length === 0) {
    throw new Error('la lista de funciones vino vacia; formato de salida inesperado');
  }

  return functions;
}

let deployed;
try {
  deployed = listDeployedFunctions();
} catch (error) {
  console.warn('[check:functions] No se pudo consultar el proyecto Supabase.');
  console.warn('[check:functions] Se omite la comprobacion.', error.message?.split('\n')[0] ?? '');
  process.exit(0);
}

const declared = readDeclaredConfig();
const problems = [];

for (const fn of deployed) {
  const entrypoint = fn.entrypoint_path ?? '';

  // Un deploy hecho desde otro repo deja su ruta local en entrypoint_path.
  // Los deploys normales apuntan a un directorio temporal del builder, que es
  // lo esperado y no dice nada del origen.
  const foreignPath = /\/(landing-gerow|ISAPRE)\//i.test(entrypoint);
  if (foreignPath) {
    problems.push(
      `${fn.slug}: desplegada desde fuera de este repo\n    entrypoint: ${entrypoint}`,
    );
  }

  if (!declared.has(fn.slug)) {
    problems.push(
      `${fn.slug}: desplegada pero sin declarar en supabase/config.toml ` +
        `(verify_jwt real: ${fn.verify_jwt})`,
    );
    continue;
  }

  const expected = declared.get(fn.slug);
  if (expected !== undefined && expected !== fn.verify_jwt) {
    problems.push(
      `${fn.slug}: verify_jwt desplegado (${fn.verify_jwt}) no coincide con ` +
        `config.toml (${expected})`,
    );
  }
}

if (problems.length > 0) {
  console.error('[check:functions] Deriva detectada:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nVer PROTOCOLO_CONTROL.md 15.5 y supabase/functions/README.md.');
  process.exit(1);
}

console.log(`[check:functions] ${deployed.length} funciones desplegadas, sin deriva.`);
