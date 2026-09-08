import { describe, it, expect } from 'vitest';
import {
  filtrarPorInscripcion,
  indexarPosiciones,
  ocupaElCanal,
  ordenarCandidatos,
  posicionVisible,
  type PosicionEnFlujo,
} from './flowEnrollSort';
import type { PuntoDeRetoma } from './flowResume';

const ANA = { id: 'a', name: 'Ana' };
const BRUNO = { id: 'b', name: 'Bruno' };
const CARLA = { id: 'c', name: 'Carla' };
const SUELTO = { id: 'z', name: 'Zoe' };

function posicion(
  leadId: string,
  flowName: string,
  stepOrder: number | null,
  channel: PosicionEnFlujo['channel'] = 'whatsapp',
): PosicionEnFlujo {
  return { leadId, flowId: `f-${flowName}`, flowName, channel, stepOrder, dueAt: null };
}

/* Ana y Carla en "Cold" (pasos 2 y 1); Bruno en "Bienvenida" (paso 3). */
const POSICIONES = indexarPosiciones([
  posicion('a', 'Cold', 2),
  posicion('b', 'Bienvenida', 3),
  posicion('c', 'Cold', 1),
]);

const SIN_PUNTOS = new Map<string, PuntoDeRetoma>();

describe('filtrarPorInscripcion', () => {
  const todos = [ANA, BRUNO, CARLA, SUELTO];

  /* Zoe no esta en ningun flujo, pero recibio el mensaje del paso 2: es el caso
     normal de este producto -el flujo se armo despues de escribir a mano-. */
  const PUNTOS = new Map<string, PuntoDeRetoma>([
    ['z', { leadId: 'z', ultimoPasoHecho: 2, ultimoEnvioAt: '2026-09-07T10:00:00Z' }],
  ]);

  it('"todos" devuelve el mismo arreglo', () => {
    expect(filtrarPorInscripcion(todos, 'todos', POSICIONES, PUNTOS)).toEqual(todos);
  });

  it('separa a los que estan en un flujo de los que no', () => {
    expect(filtrarPorInscripcion(todos, 'en-flujo', POSICIONES, PUNTOS).map((l) => l.name)).toEqual([
      'Ana',
      'Bruno',
      'Carla',
    ]);
    expect(filtrarPorInscripcion(todos, 'sin-flujo', POSICIONES, PUNTOS).map((l) => l.name)).toEqual(
      ['Zoe'],
    );
  });

  it('"ya recibió mensajes" NO es lo mismo que estar en un flujo', () => {
    // Es la distincion que faltaba: Zoe recibio el paso 2 sin haber estado
    // inscrita nunca, asi que no salia en "en algun flujo" -no lo esta- y en
    // "todos" quedaba mezclada entre mil. Justo la que hay que inscribir.
    expect(filtrarPorInscripcion(todos, 'con-envios', POSICIONES, PUNTOS).map((l) => l.name)).toEqual(
      ['Zoe'],
    );
  });

  it('un lead sin id nunca cuenta como inscrito ni como contactado', () => {
    const anonimo = { id: undefined, name: 'Sin id' };

    expect(filtrarPorInscripcion([anonimo], 'en-flujo', POSICIONES, PUNTOS)).toEqual([]);
    expect(filtrarPorInscripcion([anonimo], 'con-envios', POSICIONES, PUNTOS)).toEqual([]);
    expect(filtrarPorInscripcion([anonimo], 'sin-flujo', POSICIONES, PUNTOS)).toEqual([anonimo]);
  });

  it('no muta el arreglo original', () => {
    const original = [...todos];
    filtrarPorInscripcion(todos, 'en-flujo', POSICIONES, PUNTOS);

    expect(todos).toEqual(original);
  });
});

describe('ocupaElCanal', () => {
  /*
   * La 108 admite UNA inscripcion activa por lead y canal. Comprobarlo antes es
   * lo que evita que la base rechace la inscripcion despues de pulsar.
   */
  it('encuentra la inscripcion del mismo canal', () => {
    const posiciones = [posicion('a', 'Cold', 2, 'whatsapp'), posicion('a', 'Boletin', 1, 'email')];

    expect(ocupaElCanal(posiciones, 'whatsapp')?.flowName).toBe('Cold');
    expect(ocupaElCanal(posiciones, 'email')?.flowName).toBe('Boletin');
    expect(ocupaElCanal(posiciones, 'call')).toBeUndefined();
  });

  it('sin posiciones no ocupa nada', () => {
    expect(ocupaElCanal(undefined, 'whatsapp')).toBeUndefined();
  });
});

describe('posicionVisible', () => {
  it('prefiere la del canal del flujo que se esta mirando', () => {
    const posiciones = [posicion('a', 'Boletin', 1, 'email'), posicion('a', 'Cold', 2, 'whatsapp')];

    expect(posicionVisible(posiciones, 'whatsapp')?.flowName).toBe('Cold');
  });

  it('si no hay del canal, muestra la que haya: estar en otro flujo tambien importa', () => {
    const posiciones = [posicion('a', 'Boletin', 1, 'email')];

    expect(posicionVisible(posiciones, 'whatsapp')?.flowName).toBe('Boletin');
  });
});

describe('orden por nombre', () => {
  it('no depende de las posiciones', () => {
    const orden = ordenarCandidatos([CARLA, ANA, BRUNO], 'nombre', POSICIONES, SIN_PUNTOS, 'whatsapp');

    expect(orden.map((l) => l.name)).toEqual(['Ana', 'Bruno', 'Carla']);
  });
});

describe('orden por flujo', () => {
  it('agrupa por nombre de flujo y, dentro, por fase', () => {
    const orden = ordenarCandidatos(
      [ANA, BRUNO, CARLA],
      'flujo',
      POSICIONES,
      SIN_PUNTOS,
      'whatsapp',
    );

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Carla', 'Ana']);
  });

  it('los que no estan en ningun flujo van al final', () => {
    // Son la mayoria: si fueran primero, empujarian fuera de la primera pagina
    // a los pocos que se querian mirar.
    const orden = ordenarCandidatos(
      [SUELTO, ANA, BRUNO],
      'flujo',
      POSICIONES,
      SIN_PUNTOS,
      'whatsapp',
    );

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana', 'Zoe']);
  });
});

describe('orden por fase', () => {
  it('primero los mas atrasados', () => {
    const orden = ordenarCandidatos([ANA, BRUNO, CARLA], 'fase', POSICIONES, SIN_PUNTOS, 'whatsapp');

    expect(orden.map((l) => l.name)).toEqual(['Carla', 'Ana', 'Bruno']);
  });

  it('una inscripcion sin paso pendiente no se cuela como la mas atrasada', () => {
    // No esta retrasada: esta esperando a que la base le cree el paso
    // siguiente. Ponerla primera la mezclaria con las que si lo estan.
    const posiciones = indexarPosiciones([posicion('a', 'Cold', null), posicion('b', 'Cold', 2)]);
    const orden = ordenarCandidatos([ANA, BRUNO], 'fase', posiciones, SIN_PUNTOS, 'whatsapp');

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana']);
  });
});

describe('orden por lo que ya recibio', () => {
  const puntos = new Map<string, PuntoDeRetoma>([
    ['a', { leadId: 'a', ultimoPasoHecho: 1, ultimoEnvioAt: '2026-09-01T10:00:00Z' }],
    ['b', { leadId: 'b', ultimoPasoHecho: 2, ultimoEnvioAt: '2026-09-02T10:00:00Z' }],
  ]);

  it('pone primero al mas avanzado, que es a quien menos le falta', () => {
    const orden = ordenarCandidatos([ANA, BRUNO, SUELTO], 'ya-recibio', POSICIONES, puntos, 'whatsapp');

    expect(orden.map((l) => l.name)).toEqual(['Bruno', 'Ana', 'Zoe']);
  });

  it('empata por nombre entre los que no recibieron nada', () => {
    const orden = ordenarCandidatos(
      [SUELTO, { id: 'w', name: 'Aaron' }],
      'ya-recibio',
      POSICIONES,
      puntos,
      'whatsapp',
    );

    expect(orden.map((l) => l.name)).toEqual(['Aaron', 'Zoe']);
  });
});

describe('la funcion no muta', () => {
  it('deja el arreglo original como estaba', () => {
    const original = [CARLA, ANA, BRUNO];
    const copia = [...original];

    ordenarCandidatos(original, 'fase', POSICIONES, SIN_PUNTOS, 'whatsapp');

    expect(original).toEqual(copia);
  });
});
