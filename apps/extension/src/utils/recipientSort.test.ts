import { describe, it, expect } from 'vitest';
import { ordenarDestinatarios, ORDENES_DESTINATARIO } from './recipientSort';
import type { LeadSendSummary } from '../services/historyService';

function resumen(
  lastSentAt: string,
  lastTemplateName: string | null = null,
  total = 1,
): LeadSendSummary {
  return {
    total,
    lastSentAt,
    lastTemplateId: null,
    lastTemplateName,
    lastTemplateType: 'whatsapp',
  };
}

const ANA = { id: 'a', name: 'Ana' };
const BRUNO = { id: 'b', name: 'Bruno' };
const CARLA = { id: 'c', name: 'Carla' };
const SIN_ENVIOS = { id: 'z', name: 'Zoe' };

const CATEGORIA: Record<string, string> = { a: 'Frios', b: 'Activos', c: 'Frios' };
const categoriaDe = (s: LeadSendSummary) => (s.lastTemplateName ? CATEGORIA[s.lastTemplateName] ?? '' : '');

describe('orden por nombre', () => {
  it('no depende del resumen de envios', () => {
    const orden = ordenarDestinatarios([CARLA, ANA, BRUNO], 'nombre', new Map(), () => '');

    expect(orden.map((l) => l.name)).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('la tilde no manda el nombre al final', () => {
    const angela = { id: 'x', name: 'Ángela' };
    const orden = ordenarDestinatarios([{ id: 'y', name: 'Zoe' }, angela, ANA], 'nombre', new Map(), () => '');

    expect(orden.map((l) => l.name)).toEqual(['Ana', 'Ángela', 'Zoe']);
  });
});

describe('orden por ultimo envio', () => {
  const mapa = new Map([
    ['a', resumen('2026-08-01T10:00:00Z')],
    ['b', resumen('2026-08-20T10:00:00Z')],
    ['c', resumen('2026-08-10T10:00:00Z')],
  ]);

  it('pone lo mas reciente primero', () => {
    const orden = ordenarDestinatarios([ANA, BRUNO, CARLA], 'ultimo-envio', mapa, () => '');

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Carla', 'Ana']);
  });

  it('quien nunca recibio un mensaje va AL FINAL, no al principio', () => {
    // Es la decision contraintuitiva del modulo: ordenar por ultimo envio busca
    // a quien hace mucho que no le escribis, no a quien no le escribiste nunca.
    // Si los nuevos fueran primero, empujarian a los contactados fuera de la
    // primera pagina, que es justo lo que se queria mirar.
    const orden = ordenarDestinatarios([SIN_ENVIOS, ANA, BRUNO], 'ultimo-envio', mapa, () => '');

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana', 'Zoe']);
  });

  it('dos sin envios se ordenan entre si por nombre', () => {
    const otro = { id: 'w', name: 'Aaron' };
    const orden = ordenarDestinatarios([SIN_ENVIOS, otro], 'ultimo-envio', new Map(), () => '');

    expect(orden.map((l) => l.name)).toEqual(['Aaron', 'Zoe']);
  });
});

describe('orden por plantilla', () => {
  const mapa = new Map([
    ['a', resumen('2026-08-01T10:00:00Z', 'WS Cold')],
    ['b', resumen('2026-08-02T10:00:00Z', 'Bienvenida')],
    ['c', resumen('2026-08-03T10:00:00Z', 'WS Cold')],
  ]);

  it('agrupa por el nombre de la ultima plantilla', () => {
    const orden = ordenarDestinatarios([ANA, BRUNO, CARLA], 'plantilla', mapa, () => '');

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana', 'Carla']);
  });

  it('dentro de la misma plantilla desempata por nombre', () => {
    // Sin desempate, dos leads con la misma plantilla quedarian en el orden que
    // trajo la consulta, que cambia entre recargas sin motivo visible.
    const orden = ordenarDestinatarios([CARLA, ANA], 'plantilla', mapa, () => '');

    expect(orden.map((l) => l.name)).toEqual(['Ana', 'Carla']);
  });

  it('sin envios va al final', () => {
    const orden = ordenarDestinatarios([SIN_ENVIOS, ANA], 'plantilla', mapa, () => '');

    expect(orden.map((l) => l.name)).toEqual(['Ana', 'Zoe']);
  });
});

describe('orden por categoria', () => {
  const mapa = new Map([
    ['a', resumen('2026-08-01T10:00:00Z', 'a')],
    ['b', resumen('2026-08-02T10:00:00Z', 'b')],
    ['c', resumen('2026-08-03T10:00:00Z', 'c')],
  ]);

  it('usa la categoria que resuelve el llamador', () => {
    // La categoria no viene de la base: la resuelve quien llama, cruzando la
    // plantilla del ultimo envio con las categorias que ya tiene cargadas.
    const orden = ordenarDestinatarios([ANA, BRUNO, CARLA], 'categoria', mapa, categoriaDe);

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana', 'Carla']);
  });
});

describe('la funcion no muta', () => {
  it('deja el arreglo original como estaba', () => {
    const original = [CARLA, ANA, BRUNO];
    const copia = [...original];

    ordenarDestinatarios(original, 'nombre', new Map(), () => '');

    expect(original).toEqual(copia);
  });
});

describe('catalogo de ordenes', () => {
  it('no hay dos criterios con el mismo valor', () => {
    const valores = ORDENES_DESTINATARIO.map((o) => o.value);

    expect(new Set(valores).size).toBe(valores.length);
  });
});
