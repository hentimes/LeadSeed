import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { BRAND, STATE } from './colors';

/**
 * `colors.ts` y `tokens.css` son la misma decision escrita en dos lenguajes.
 * El comentario de `colors.ts` pide mantenerlos sincronizados a mano, y un
 * comentario no detiene a nadie: esto si.
 *
 * Se lee el CSS como texto a proposito, en vez de importarlo. Lo que hay que
 * comprobar es lo que dice el fichero fuente, no lo que un navegador calcula.
 */
const css = readFileSync(join(__dirname, '..', 'design', 'tokens.css'), 'utf-8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('.dark'));
const darkBlock = css.slice(css.indexOf('.dark'));

function tokenEnRoot(nombre: string): string | undefined {
  return new RegExp(`--ls-${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(rootBlock)?.[1];
}

/** token en colors.ts -> nombre de la variable en tokens.css */
const EQUIVALENCIAS: [string, string][] = [
  [BRAND.primary, 'primary'],
  [BRAND.primaryHover, 'primary-hover'],
  [BRAND.primaryDeep, 'primary-deep'],
  [BRAND.primaryLight, 'primary-light'],
  [STATE.success, 'success'],
  [STATE.warning, 'warning'],
  [STATE.danger, 'danger'],
  [STATE.info, 'info'],
];

describe('colors.ts refleja tokens.css', () => {
  test.each(EQUIVALENCIAS)('%s es el valor de --ls-%s', (valor, nombre) => {
    expect(tokenEnRoot(nombre)?.toLowerCase()).toBe(valor.toLowerCase());
  });

  test('ninguno de estos colores se redefine en modo oscuro', () => {
    // Es la premisa que permite tenerlos como constante: si alguno pasara a
    // depender del tema, la constante empezaria a mentir en oscuro y habria
    // que sacarlo de aqui, no actualizar su valor.
    const redefinidos = EQUIVALENCIAS
      .map(([, nombre]) => nombre)
      .filter((nombre) => new RegExp(`--ls-${nombre}:`).test(darkBlock));

    expect(redefinidos).toEqual([]);
  });
});
