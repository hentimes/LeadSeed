import { describe, expect, test } from 'vitest';
import {
  detectMentionQuery,
  insertMention,
  parseMentions,
  serializeFromDisplay,
  serializeMention,
  toPlainText,
} from './mentionParser';

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTRO_UUID = '9c858901-8a57-4791-81fe-4c455b099bc9';

describe('parseMentions', () => {
  test('devuelve un solo token de texto cuando no hay menciones', () => {
    expect(parseMentions('hola equipo')).toEqual([
      { type: 'text', value: 'hola equipo' },
    ]);
  });

  test('separa texto y mencion conservando el orden', () => {
    const tokens = parseMentions(`hola @[Ana](user:${UUID}) como estas`);

    expect(tokens).toEqual([
      { type: 'text', value: 'hola ' },
      { type: 'mention', mention: { label: 'Ana', kind: 'user', id: UUID } },
      { type: 'text', value: ' como estas' },
    ]);
  });

  test('reconoce menciones a publicaciones ademas de usuarios', () => {
    const tokens = parseMentions(`ver @[Post](post:${UUID})`);

    expect(tokens[1]).toEqual({
      type: 'mention',
      mention: { label: 'Post', kind: 'post', id: UUID },
    });
  });

  test('maneja varias menciones seguidas sin perder el texto intermedio', () => {
    const tokens = parseMentions(`@[Ana](user:${UUID}) y @[Bruno](user:${OTRO_UUID})`);

    expect(tokens.filter((t) => t.type === 'mention')).toHaveLength(2);
    expect(tokens[1]).toEqual({ type: 'text', value: ' y ' });
  });

  test('no interpreta como mencion un texto que solo se le parece', () => {
    const tokens = parseMentions('@Ana escribio algo');
    expect(tokens).toEqual([{ type: 'text', value: '@Ana escribio algo' }]);
  });

  test('no interpreta como mencion un id que no es UUID', () => {
    const tokens = parseMentions('@[Ana](user:123)');
    expect(tokens.every((t) => t.type === 'text')).toBe(true);
  });

  test('devuelve una lista vacia para un contenido vacio', () => {
    expect(parseMentions('')).toEqual([]);
  });
});

describe('serializeMention y toPlainText', () => {
  test('serializeMention produce el formato que parseMentions entiende', () => {
    const mention = { label: 'Ana', kind: 'user' as const, id: UUID };
    const tokens = parseMentions(serializeMention(mention));

    expect(tokens).toEqual([{ type: 'mention', mention }]);
  });

  test('toPlainText reduce la mencion a su etiqueta legible', () => {
    expect(toPlainText(`hola @[Ana Perez](user:${UUID})`)).toBe('hola @Ana Perez');
  });

  test('toPlainText deja intacto el texto sin menciones', () => {
    expect(toPlainText('sin menciones aca')).toBe('sin menciones aca');
  });
});

describe('detectMentionQuery', () => {
  test('detecta una mencion en curso al final del texto', () => {
    expect(detectMentionQuery('hola @an', 8)).toEqual({ term: 'an', start: 5, end: 8 });
  });

  test('detecta el arroba que abre el texto', () => {
    expect(detectMentionQuery('@an', 3)).toEqual({ term: 'an', start: 0, end: 3 });
  });

  test('detecta un arroba recien escrito, con termino vacio', () => {
    expect(detectMentionQuery('hola @', 6)).toEqual({ term: '', start: 5, end: 6 });
  });

  test('devuelve null cuando no hay arroba', () => {
    expect(detectMentionQuery('hola', 4)).toBeNull();
  });

  test('devuelve null cuando el termino ya contiene un espacio', () => {
    expect(detectMentionQuery('hola @ana perez', 15)).toBeNull();
  });

  test('devuelve null cuando el arroba no abre palabra', () => {
    // Un correo no debe disparar el autocompletado de menciones.
    expect(detectMentionQuery('ana@empresa', 11)).toBeNull();
  });

  test('devuelve null sobre una mencion ya cerrada', () => {
    const texto = `hola @[Ana](user:${UUID})`;
    expect(detectMentionQuery(texto, texto.length)).toBeNull();
  });
});

describe('insertMention', () => {
  test('reemplaza el termino en curso por la etiqueta legible y deja un espacio', () => {
    const texto = 'hola @an';
    const query = detectMentionQuery(texto, texto.length)!;
    const resultado = insertMention(texto, query, { label: 'Ana', kind: 'user', id: UUID });

    expect(resultado.text).toBe('hola @Ana ');
    expect(resultado.cursor).toBe(resultado.text.length);
  });

  test('conserva el texto que viene despues del cursor', () => {
    const texto = 'hola @an, saludos';
    const query = { term: 'an', start: 5, end: 8 };
    const resultado = insertMention(texto, query, { label: 'Ana', kind: 'user', id: UUID });

    expect(resultado.text).toBe('hola @Ana , saludos');
  });
});

describe('serializeFromDisplay', () => {
  test('convierte la etiqueta elegida al formato con identificador', () => {
    const mention = { label: 'Ana', kind: 'user' as const, id: UUID };

    expect(serializeFromDisplay('hola @Ana ', [mention])).toBe(
      `hola ${serializeMention(mention)} `,
    );
  });

  test('deja como texto suelto un arroba escrito a mano', () => {
    // Solo se serializa lo que el usuario eligio del autocompletado.
    expect(serializeFromDisplay('hola @juan', [])).toBe('hola @juan');
  });

  test('una etiqueta prefijo de otra no se come la mencion mas larga', () => {
    const ana = { label: 'Ana', kind: 'user' as const, id: UUID };
    const anaPerez = { label: 'Ana Perez', kind: 'user' as const, id: OTRO_UUID };

    const resultado = serializeFromDisplay('@Ana Perez y @Ana', [ana, anaPerez]);

    expect(resultado).toBe(`${serializeMention(anaPerez)} y ${serializeMention(ana)}`);
  });

  test('el resultado se puede volver a parsear sin perder informacion', () => {
    const mention = { label: 'Ana', kind: 'user' as const, id: UUID };
    const serializado = serializeFromDisplay('hola @Ana', [mention]);
    const tokens = parseMentions(serializado);

    expect(tokens).toContainEqual({ type: 'mention', mention });
  });
});
