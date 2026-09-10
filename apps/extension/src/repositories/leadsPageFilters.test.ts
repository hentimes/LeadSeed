import { describe, expect, test } from 'vitest';
import { applyLeadPageFilters } from './leadsRepository';
import type { LeadPageQuery } from './leadsRepository';

/**
 * EL INVARIANTE DE DUEÑO EN LA BANDEJA DE LEADS
 *
 * `applyLeadPageFilters` es el unico punto por el que pasan todas las lecturas
 * de la bandeja. La auditoria CONTROL del 2026-09-10 encontro que la capa de
 * repositorios tenia 1 archivo de prueba para 44 fuentes, y que era justo la
 * capa donde una consulta mal filtrada se convierte en un fallo de aislamiento.
 *
 * ## Que se prueba y que NO
 *
 * NO se prueba que RLS funcione. Un doble del cliente devuelve lo que se le
 * diga, asi que una prueba asi solo daria sensacion de seguridad. El aislamiento
 * real lo impone la base -`leads` tiene `USING (auth.uid() = user_id)`- y eso se
 * verifica contra la base, no aca.
 *
 * SI se prueba lo unico que esta capa decide de verdad: **que consulta se
 * construye**. Concretamente, que `user_id` va siempre, en toda combinacion de
 * filtros, y que ningun filtro lo pisa ni lo hace condicional.
 *
 * Comprobado por mutacion el 2026-09-10: metiendo el `.eq('user_id')` dentro de
 * un `if`, 7 de estos 12 casos fallan. La prueba detecta lo que dice detectar.
 *
 * ## Por que un doble que registra y no un mock de Supabase
 *
 * La funcion recibe un constructor de consulta y encadena siete metodos sobre
 * el. Lo que interesa comprobar es la secuencia de llamadas, no un resultado,
 * asi que el doble solo anota que se le pidio y se devuelve a si mismo.
 */

interface LlamadaRegistrada {
  metodo: string;
  args: unknown[];
}

function constructorFalso() {
  const llamadas: LlamadaRegistrada[] = [];

  const registrar =
    (metodo: string) =>
    (...args: unknown[]) => {
      llamadas.push({ metodo, args });
      return doble;
    };

  const doble = {
    eq: registrar('eq'),
    neq: registrar('neq'),
    gte: registrar('gte'),
    is: registrar('is'),
    not: registrar('not'),
    or: registrar('or'),
    contains: registrar('contains'),
    llamadas,
  };

  return doble;
}

const USUARIO = '11111111-1111-4111-8111-111111111111';

/** La bandeja siempre pide una pagina; los casos solo varian los filtros. */
const PAGINA = { page: 1, pageSize: 50 } as const;

function filtrosAplicados(params: LeadPageQuery): LlamadaRegistrada[] {
  const doble = constructorFalso();
  applyLeadPageFilters(doble, USUARIO, params);
  return doble.llamadas;
}

/** Todas las combinaciones que la interfaz puede producir de verdad. */
const CASOS: { nombre: string; params: LeadPageQuery }[] = [
  { nombre: 'sin ningun filtro', params: { ...PAGINA } },
  { nombre: 'papelera', params: { ...PAGINA, deleted: true } },
  { nombre: 'por lista', params: { ...PAGINA, listId: 7 } },
  { nombre: 'por estado', params: { ...PAGINA, status: 'contactado' } },
  { nombre: 'por origen', params: { ...PAGINA, origin: 'web_form' } },
  { nombre: 'con busqueda', params: { ...PAGINA, search: 'Henry Farias' } },
  { nombre: 'ocultando los sin nombre', params: { ...PAGINA, hideUnnamed: true } },
  {
    nombre: 'todo a la vez',
    params: {
      ...PAGINA,
      deleted: true,
      listId: 3,
      status: 'nuevo',
      origin: 'manual',
      search: 'algo',
      hideUnnamed: true,
    },
  },
];

describe('applyLeadPageFilters mantiene el filtro de dueño', () => {
  test.each(CASOS)('$nombre lleva user_id', ({ params }) => {
    const porDueno = filtrosAplicados(params).filter(
      (l) => l.metodo === 'eq' && l.args[0] === 'user_id',
    );

    expect(porDueno).toHaveLength(1);
    expect(porDueno[0]?.args[1]).toBe(USUARIO);
  });

  test('el filtro de dueño es lo primero que se aplica', () => {
    // Importa el orden: si un filtro anterior pudiera lanzar o cortocircuitar,
    // el de dueño se perderia. Poniendolo primero, no hay rama que lo evite.
    const primera = filtrosAplicados({ ...PAGINA, deleted: true, search: 'x' })[0];

    expect(primera?.metodo).toBe('eq');
    expect(primera?.args[0]).toBe('user_id');
  });

  test('ningun filtro posterior vuelve a tocar user_id', () => {
    // Un segundo `eq('user_id', ...)` con otro valor daria una consulta que no
    // devuelve nada, y el sintoma seria una bandeja vacia sin error.
    for (const { params } of CASOS) {
      const tocan = filtrosAplicados(params).filter((l) => l.args[0] === 'user_id');
      expect(tocan).toHaveLength(1);
    }
  });
});

describe('la papelera y la bandeja activa se excluyen', () => {
  test('la bandeja activa pide deleted_at nulo', () => {
    const llamadas = filtrosAplicados({ ...PAGINA });

    expect(llamadas).toContainEqual({ metodo: 'is', args: ['deleted_at', null] });
    expect(llamadas.some((l) => l.metodo === 'not')).toBe(false);
  });

  test('la papelera pide deleted_at NO nulo', () => {
    const llamadas = filtrosAplicados({ ...PAGINA, deleted: true });

    expect(llamadas).toContainEqual({ metodo: 'not', args: ['deleted_at', 'is', null] });
    expect(llamadas.some((l) => l.metodo === 'is' && l.args[0] === 'deleted_at')).toBe(false);
  });
});
