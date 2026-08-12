import { describe, expect, test } from 'vitest';
import { buildRealtimeChannelName, uniqueChannelName } from './realtimeChannel';

const USER_A = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const USER_B = '9c858901-8a57-4791-81fe-4c455b099bc9';

describe('buildRealtimeChannelName', () => {
  test('conserva el nombre logico como prefijo legible', () => {
    // Importa para poder reconocer el canal al depurar en el panel de Supabase.
    expect(buildRealtimeChannelName('public:leads', USER_A, ':r1:')).toMatch(/^public:leads:/);
  });

  test('dos usuarios distintos no comparten canal', () => {
    expect(buildRealtimeChannelName('public:leads', USER_A, ':r1:')).not.toBe(
      buildRealtimeChannelName('public:leads', USER_B, ':r1:'),
    );
  });

  test('dos instancias del mismo hook en la misma sesion no comparten canal', () => {
    // Este es el caso que el sufijo por usuario NO resolveria por si solo: un
    // modal que monta useLists() dentro de una pagina que ya lo usa.
    expect(buildRealtimeChannelName('public:lead_lists', USER_A, ':r1:')).not.toBe(
      buildRealtimeChannelName('public:lead_lists', USER_A, ':r2:'),
    );
  });

  test('dos tablas distintas no comparten canal', () => {
    expect(buildRealtimeChannelName('public:leads', USER_A, ':r1:')).not.toBe(
      buildRealtimeChannelName('public:lead_lists', USER_A, ':r1:'),
    );
  });

  test('es estable para las mismas entradas', () => {
    // Un nombre inestable haria que el efecto se resuscribiera en cada render.
    expect(buildRealtimeChannelName('public:leads', USER_A, ':r1:')).toBe(
      buildRealtimeChannelName('public:leads', USER_A, ':r1:'),
    );
  });

  test('normaliza los dos puntos que trae useId de React', () => {
    const name = buildRealtimeChannelName('public:leads', USER_A, ':r1:');

    // Cuatro segmentos: el nombre logico ya aporta uno ('public' + 'leads'),
    // mas usuario e instancia. Sin normalizar, los dos puntos que envuelven el
    // valor de useId agregarian dos separadores mas.
    expect(name.split(':')).toHaveLength(4);
    expect(name).toBe(`public:leads:${USER_A}:r1`);
  });

  test('cae a un ambito anonimo cuando no hay usuario', () => {
    expect(buildRealtimeChannelName('public:leads', null, ':r1:')).toBe('public:leads:anon:r1');
    expect(buildRealtimeChannelName('public:leads', undefined, ':r1:')).toBe('public:leads:anon:r1');
    expect(buildRealtimeChannelName('public:leads', '   ', ':r1:')).toBe('public:leads:anon:r1');
  });
});

describe('uniqueChannelName', () => {
  test('nunca repite un nombre, aunque el logico sea el mismo', () => {
    const nombres = new Set(
      Array.from({ length: 50 }, () => uniqueChannelName('chat-unread-watch')),
    );

    expect(nombres.size).toBe(50);
  });

  test('conserva el nombre logico como prefijo', () => {
    expect(uniqueChannelName('community-posts')).toMatch(/^community-posts:/);
  });

  test('incluye el ambito cuando se entrega', () => {
    expect(uniqueChannelName('public:internal_messages_user', USER_A)).toContain(USER_A);
  });

  test('omite el segmento de ambito cuando no hay', () => {
    const name = uniqueChannelName('chat_replies');

    expect(name).toMatch(/^chat_replies:i\d+$/);
  });

  test('dos suscripciones del mismo usuario al mismo canal logico no colisionan', () => {
    // El caso real: dos vistas de soporte abiertas a la vez sobre
    // subscribeReceiverMessages, que usaba un nombre fijo.
    expect(uniqueChannelName('public:internal_messages_user', USER_A)).not.toBe(
      uniqueChannelName('public:internal_messages_user', USER_A),
    );
  });
});
