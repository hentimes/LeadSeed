import { describe, expect, test } from 'vitest';
import { buildLeadMessages, buildWhatsAppUrl, normalizePhone, replaceVariables } from './waHelper';
import type { Lead } from '../types';

describe('normalizePhone', () => {
  test('acepta nueve digitos que empiezan en 9', () => {
    expect(normalizePhone('912345678')).toBe('+56912345678');
  });

  test('acepta once digitos que empiezan en 569', () => {
    expect(normalizePhone('56912345678')).toBe('+56912345678');
  });

  test('descarta separadores y prefijos escritos a mano', () => {
    expect(normalizePhone('+56 9 1234 5678')).toBe('+56912345678');
    expect(normalizePhone('(569) 1234-5678')).toBe('+56912345678');
  });

  test('rechaza longitudes invalidas', () => {
    expect(normalizePhone('12345678')).toBe('');
    expect(normalizePhone('1234567890')).toBe('');
    expect(normalizePhone('123456789012')).toBe('');
  });

  test('rechaza nueve digitos que no empiezan en 9', () => {
    // Un fijo chileno no sirve para WhatsApp.
    expect(normalizePhone('221234567')).toBe('');
  });

  test('rechaza once digitos con prefijo de otro pais', () => {
    expect(normalizePhone('54912345678')).toBe('');
  });

  test('rechaza entrada vacia o sin digitos', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('sin numero')).toBe('');
  });
});

describe('buildWhatsAppUrl', () => {
  test('usa el protocolo universal cuando se prefiere la app', () => {
    // api.whatsapp.com lanza la aplicacion nativa si esta instalada.
    expect(buildWhatsAppUrl('+56912345678', 'hola', 'app')).toContain('api.whatsapp.com');
  });

  test('fuerza el cliente web cuando se prefiere web', () => {
    expect(buildWhatsAppUrl('+56912345678', 'hola', 'web')).toContain('web.whatsapp.com');
  });

  test('quita todo lo que no sea digito del telefono', () => {
    expect(buildWhatsAppUrl('+56 9 1234 5678', '', 'web')).toContain('phone=56912345678');
  });

  test('codifica el mensaje para que no rompa la URL', () => {
    const url = buildWhatsAppUrl('+56912345678', 'hola & adios ?', 'web');

    expect(url).toContain('text=hola%20%26%20adios%20%3F');
    // El & del mensaje no debe verse como separador de parametros.
    expect(url.split('&')).toHaveLength(2);
  });

  test('codifica saltos de linea y acentos', () => {
    const url = buildWhatsAppUrl('+56912345678', 'línea1\nlínea2', 'web');

    expect(url).not.toContain('\n');
    expect(url).toContain('%0A');
  });

  test('tolera un mensaje vacio', () => {
    expect(buildWhatsAppUrl('+56912345678', '', 'web')).toContain('text=');
  });
});

describe('replaceVariables', () => {
  const lead = {
    name: 'Ana Perez',
    phone: '+56912345678',
    email: 'ana@ejemplo.cl',
    company: 'Acme',
    rut: '12345678-5',
    notes: 'prefiere tardes',
  } as Lead;

  test('reemplaza las variables en español y en ingles', () => {
    expect(replaceVariables('Hola {nombre}, {name}', lead)).toBe('Hola Ana Perez, Ana Perez');
    expect(replaceVariables('{empresa}/{company}', lead)).toBe('Acme/Acme');
  });

  test('no distingue mayusculas', () => {
    expect(replaceVariables('{NOMBRE} {Nombre}', lead)).toBe('Ana Perez Ana Perez');
  });

  test('reemplaza todas las ocurrencias, no solo la primera', () => {
    expect(replaceVariables('{nombre} y {nombre}', lead)).toBe('Ana Perez y Ana Perez');
  });

  test('deja intacto lo que no es una variable conocida', () => {
    expect(replaceVariables('Hola {inventada}', lead)).toBe('Hola {inventada}');
  });

  test('cubre el resto de campos', () => {
    expect(replaceVariables('{telefono} {correo} {rut} {notas}', lead)).toBe(
      '+56912345678 ana@ejemplo.cl 12345678-5 prefiere tardes',
    );
  });
});

describe('buildLeadMessages', () => {
  const leads = [
    { name: 'Ana Perez', phone: '+56911111111', company: 'Acme' },
    { name: 'Luis Soto', phone: '+56922222222', company: 'Beta' },
  ] as Lead[];

  test('resuelve el texto una vez por destinatario', () => {
    const mensajes = buildLeadMessages(leads, 'Hola {nombre} de {empresa}');

    expect(mensajes).toHaveLength(2);
    expect(mensajes[0]?.message).toBe('Hola Ana Perez de Acme');
    expect(mensajes[1]?.message).toBe('Hola Luis Soto de Beta');
  });

  test('conserva el lead junto a su mensaje, para poder registrarlos juntos', () => {
    const mensajes = buildLeadMessages(leads, 'Hola {nombre}');

    expect(mensajes[0]?.lead).toBe(leads[0]);
    expect(mensajes[1]?.lead).toBe(leads[1]);
  });

  test('da el mismo texto que replaceVariables, que es lo que hace que el historial no mienta', () => {
    // Si estas dos resoluciones se separaran, el historial guardaria un texto y
    // WhatsApp abriria otro, sin que nada fallara.
    const plantilla = 'Hola {nombre}, {telefono}';

    for (const { lead, message } of buildLeadMessages(leads, plantilla)) {
      expect(message).toBe(replaceVariables(plantilla, lead));
    }
  });

  test('devuelve lista vacia sin destinatarios', () => {
    expect(buildLeadMessages([], 'Hola {nombre}')).toEqual([]);
  });
});
