import { describe, expect, test } from 'vitest';
import { hasActiveLeadFilters, tokenizeSearch } from './leadsRepository';

/**
 * `tokenizeSearch` es la unica defensa entre el texto que escribe el usuario en
 * la bandeja y el `or()` de PostgREST, cuya sintaxis usa coma y parentesis como
 * separadores. Hasta el 2026-08-12 no tenia ni un solo test.
 */
describe('tokenizeSearch', () => {
  test('separa la busqueda en palabras', () => {
    expect(tokenizeSearch('Henry Farias')).toEqual(['Henry', 'Farias']);
  });

  test('colapsa espacios repetidos y saltos de linea', () => {
    expect(tokenizeSearch('  Henry   Farias \n Pacheco ')).toEqual([
      'Henry',
      'Farias',
      'Pacheco',
    ]);
  });

  test('devuelve una lista vacia cuando no hay busqueda', () => {
    expect(tokenizeSearch()).toEqual([]);
    expect(tokenizeSearch('')).toEqual([]);
    expect(tokenizeSearch('   ')).toEqual([]);
  });

  describe('neutraliza los caracteres que romperian la sintaxis de or()', () => {
    test('elimina la coma, que separa condiciones en PostgREST', () => {
      expect(tokenizeSearch('a,b')).toEqual(['ab']);
    });

    test('elimina los parentesis, que agrupan condiciones', () => {
      expect(tokenizeSearch('(evil)')).toEqual(['evil']);
    });

    test('elimina los comodines de like', () => {
      expect(tokenizeSearch('%_')).toEqual([]);
      expect(tokenizeSearch('a%b_c')).toEqual(['abc']);
    });

    test('elimina comillas, asterisco y barra invertida', () => {
      expect(tokenizeSearch(`a"b'c*d\\e`)).toEqual(['abcde']);
    });

    test('una inyeccion tipica queda inerte', () => {
      // Sin saneamiento, esto cerraria el or() y agregaria una condicion propia.
      const tokens = tokenizeSearch('x,or(user_id.neq.null)');

      for (const token of tokens) {
        expect(token).not.toMatch(/[%_,()*\\"']/);
      }
      expect(tokens.join('')).not.toContain(',');
    });

    test('ningun token conserva un caracter peligroso, sea cual sea la entrada', () => {
      const entradas = [
        'nombre(1)',
        "o'brien",
        'a,b,c,d,e,f,g,h',
        '100%',
        'ruta\\interna',
        '*',
        '",(),%_*\\\'',
      ];

      for (const entrada of entradas) {
        for (const token of tokenizeSearch(entrada)) {
          expect(token, `token inseguro desde "${entrada}"`).not.toMatch(/[%_,()*\\"']/);
        }
      }
    });
  });

  test('descarta los tokens que quedan vacios tras el saneamiento', () => {
    expect(tokenizeSearch('Henry (,) Farias')).toEqual(['Henry', 'Farias']);
  });

  test('limita la busqueda a 6 palabras', () => {
    // Cada token agrega un or() a la consulta: sin tope, una busqueda larga
    // multiplica el costo del query.
    const tokens = tokenizeSearch('a b c d e f g h i j');

    expect(tokens).toHaveLength(6);
    expect(tokens).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  test('conserva acentos y enie, que son validos en nombres', () => {
    expect(tokenizeSearch('Muñoz Peña')).toEqual(['Muñoz', 'Peña']);
  });

  test('conserva el guion del RUT', () => {
    expect(tokenizeSearch('12345678-5')).toEqual(['12345678-5']);
  });

  test('conserva el arroba y el punto de un correo', () => {
    expect(tokenizeSearch('ana@empresa.cl')).toEqual(['ana@empresa.cl']);
  });
});

/**
 * `hasActiveLeadFilters` decide si se lanza la consulta de total sin filtros.
 * Si devuelve false con la bandeja filtrada, `totalCount` colapsa a
 * `filteredCount` y la UI informa "X de X" ocultando el total real.
 */
describe('hasActiveLeadFilters', () => {
  const base = { page: 1, pageSize: 50 };

  test('sin filtros no hay nada activo', () => {
    expect(hasActiveLeadFilters(base)).toBe(false);
  });

  test('detecta busqueda por texto', () => {
    expect(hasActiveLeadFilters({ ...base, search: 'ana' })).toBe(true);
  });

  test('una busqueda de solo espacios no cuenta como filtro', () => {
    expect(hasActiveLeadFilters({ ...base, search: '   ' })).toBe(false);
  });

  test('detecta lista, estado, fecha y origen', () => {
    expect(hasActiveLeadFilters({ ...base, listId: 3 })).toBe(true);
    expect(hasActiveLeadFilters({ ...base, status: 'nuevo' })).toBe(true);
    expect(hasActiveLeadFilters({ ...base, dateFilter: '7d' })).toBe(true);
    expect(hasActiveLeadFilters({ ...base, origin: 'web_form' })).toBe(true);
  });

  test('listId nulo o ausente no cuenta como filtro', () => {
    expect(hasActiveLeadFilters({ ...base, listId: null })).toBe(false);
    expect(hasActiveLeadFilters({ ...base, listId: undefined })).toBe(false);
  });

  test('listId 0 si cuenta como filtro', () => {
    // 0 es un id valido y no debe caer en la comprobacion de nulos.
    expect(hasActiveLeadFilters({ ...base, listId: 0 })).toBe(true);
  });

  test('detecta el filtro por canal de origen', () => {
    // Regresion: sourceChannel no estaba contemplado, asi que filtrar solo por
    // canal hacia que la bandeja informara el total como si no hubiera filtro.
    expect(hasActiveLeadFilters({ ...base, sourceChannel: 'pb' })).toBe(true);
    expect(hasActiveLeadFilters({ ...base, sourceChannel: 'retiro' })).toBe(true);
  });

  test('detecta el filtro por link de captura', () => {
    expect(
      hasActiveLeadFilters({ ...base, origin: 'web_form', captureLinkId: 7 }),
    ).toBe(true);
  });

  test('los valores nulos de canal y link no cuentan como filtro', () => {
    expect(hasActiveLeadFilters({ ...base, sourceChannel: null, captureLinkId: null })).toBe(false);
  });
});
