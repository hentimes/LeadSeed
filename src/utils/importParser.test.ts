import { describe, expect, test } from 'vitest';
import {
  detectMapping,
  findDuplicatesInBatch,
  normalizeRows,
  type ParsedRow,
} from './importParser';

function fila(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return { name: '', phone: '', email: '', company: '', notes: '', rut: '', status: '', ...overrides };
}

describe('detectMapping', () => {
  test('reconoce las columnas principales por su nombre exacto', () => {
    const mapping = detectMapping(['Nombre', 'Telefono', 'Email', 'Empresa', 'RUT', 'Estado']);

    expect(mapping.map((m) => m.mapped)).toEqual([
      'name', 'phone', 'email', 'company', 'rut', 'status',
    ]);
  });

  test('no distingue mayusculas ni espacios alrededor', () => {
    expect(detectMapping(['  TELEFONO  '])[0]?.mapped).toBe('phone');
  });

  test('acepta las variantes con y sin tilde', () => {
    expect(detectMapping(['teléfono'])[0]?.mapped).toBe('phone');
    expect(detectMapping(['organización'])[0]?.mapped).toBe('company');
  });

  test('acepta los sinonimos de telefono que usa la gente', () => {
    for (const col of ['celular', 'whatsapp', 'movil', 'fono', 'tel']) {
      expect(detectMapping([col])[0]?.mapped, col).toBe('phone');
    }
  });

  test('marca apellidos y DV como no mapeados, porque se fusionan con otra columna', () => {
    // No son columnas descartadas: se unen al nombre y al RUT en normalizeRows.
    for (const col of ['Apellido Paterno', 'a-materno', 'paterno', 'DV']) {
      expect(detectMapping([col])[0]?.mapped, col).toBeNull();
    }
  });

  test('conserva el nombre original de la columna', () => {
    expect(detectMapping(['Teléfono'])[0]?.original).toBe('Teléfono');
  });

  test('una columna desconocida cae en notas, no se pierde', () => {
    // Criterio del importador: antes perder un dato, meterlo en notas.
    expect(detectMapping(['columna raruna'])[0]?.mapped).toBe('notes');
  });
});

describe('normalizeRows', () => {
  test('une nombre y apellidos en un solo campo', () => {
    const columnas = ['Nombre', 'Apellido Paterno', 'Apellido Materno'];
    const filas = [{ 'Nombre': 'Ana', 'Apellido Paterno': 'Perez', 'Apellido Materno': 'Soto' }];

    expect(normalizeRows(filas, detectMapping(columnas))[0]?.name).toBe('Ana Perez Soto');
  });

  test('omite los componentes de nombre vacios sin dejar espacios dobles', () => {
    const columnas = ['Nombre', 'Apellido Paterno', 'Apellido Materno'];
    const filas = [{ 'Nombre': 'Ana', 'Apellido Paterno': '', 'Apellido Materno': 'Soto' }];

    expect(normalizeRows(filas, detectMapping(columnas))[0]?.name).toBe('Ana Soto');
  });

  test('une RUT y DV en el formato normalizado', () => {
    const columnas = ['RUT', 'DV'];
    const filas = [{ RUT: '12345678', DV: '5' }];

    expect(normalizeRows(filas, detectMapping(columnas))[0]?.rut).toBe('12345678-5');
  });

  test('conserva el RUT original cuando no se puede normalizar', () => {
    // Preferible dejar el dato crudo que descartarlo en una importacion.
    const filas = [{ RUT: 'no-es-un-rut' }];

    expect(normalizeRows(filas, detectMapping(['RUT']))[0]?.rut).toBe('no-es-un-rut');
  });

  test('deja el RUT vacio si la celda viene vacia', () => {
    expect(normalizeRows([{ RUT: '   ' }], detectMapping(['RUT']))[0]?.rut).toBe('');
  });

  test('devuelve todos los campos aunque el archivo traiga una sola columna', () => {
    const parsed = normalizeRows([{ Nombre: 'Ana' }], detectMapping(['Nombre']));

    expect(parsed[0]).toMatchObject({ name: 'Ana', phone: '', email: '', rut: '' });
  });

  test('procesa varias filas conservando el orden', () => {
    const filas = [{ Nombre: 'Ana' }, { Nombre: 'Bruno' }];

    expect(normalizeRows(filas, detectMapping(['Nombre'])).map((r) => r.name)).toEqual([
      'Ana', 'Bruno',
    ]);
  });

  test('tolera un archivo sin filas', () => {
    expect(normalizeRows([], detectMapping(['Nombre']))).toEqual([]);
  });
});

describe('findDuplicatesInBatch', () => {
  test('no reporta nada cuando no hay repetidos', () => {
    const rows = [fila({ rut: '11111111-1' }), fila({ rut: '22222222-2' })];

    expect(findDuplicatesInBatch(rows, new Set(), new Set()).size).toBe(0);
  });

  test('detecta un RUT que ya existe en la base', () => {
    const rows = [fila({ rut: '11111111-1' })];
    const dupes = findDuplicatesInBatch(rows, new Set(['11111111-1']), new Set());

    expect(dupes.get(0)?.[0]?.reason).toContain('ya existe');
  });

  test('detecta un RUT repetido dentro del mismo archivo e indica la fila', () => {
    const rows = [fila({ rut: '11111111-1' }), fila({ rut: '11111111-1' })];
    const dupes = findDuplicatesInBatch(rows, new Set(), new Set());

    // La primera aparicion no es duplicado; solo la segunda.
    expect(dupes.has(0)).toBe(false);
    expect(dupes.get(1)?.[0]?.reason).toContain('fila 1');
  });

  test('compara telefonos ignorando el formato', () => {
    // El existente esta limpio y el importado viene con espacios y guiones:
    // deben reconocerse como el mismo numero.
    const rows = [fila({ phone: '+56 9 1234-5678' })];
    const dupes = findDuplicatesInBatch(rows, new Set(), new Set(['+56912345678']));

    expect(dupes.get(0)?.[0]?.reason).toContain('ya existe');
  });

  test('detecta telefonos repetidos en el archivo aunque vengan con distinto formato', () => {
    const rows = [fila({ phone: '+56912345678' }), fila({ phone: '+56 9 1234 5678' })];
    const dupes = findDuplicatesInBatch(rows, new Set(), new Set());

    expect(dupes.has(1)).toBe(true);
  });

  test('acumula los dos motivos cuando coinciden RUT y telefono', () => {
    const rows = [fila({ rut: '11111111-1', phone: '+56912345678' })];
    const dupes = findDuplicatesInBatch(rows, new Set(['11111111-1']), new Set(['+56912345678']));

    expect(dupes.get(0)).toHaveLength(2);
  });

  test('ignora las filas sin RUT ni telefono', () => {
    // Sin identificador no hay forma de saber si es duplicado.
    const rows = [fila({ name: 'Ana' }), fila({ name: 'Ana' })];

    expect(findDuplicatesInBatch(rows, new Set(), new Set()).size).toBe(0);
  });

  test('el indice de la fila reportada coincide con su posicion', () => {
    const rows = [fila({ rut: 'a' }), fila({ rut: 'b' }), fila({ rut: 'b' })];
    const dupes = findDuplicatesInBatch(rows, new Set(), new Set());

    expect(dupes.get(2)?.[0]?.rowIndex).toBe(2);
  });
});
