import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  hayHostDeDialogos,
  pedirAviso,
  pedirConfirmacion,
  registrarHostDeDialogos,
  resetHostDeDialogos,
  type SolicitudDeDialogo,
} from './dialogBridge';

/**
 * El puente entre el puerto y el dialogo de React.
 *
 * Lo que se fija aca es lo que puede romperse en silencio: que sin host se siga
 * PREGUNTANDO -y no se asuma una respuesta-, que la respuesta llegue al llamador
 * correcto cuando hay varias en vuelo, y que dar de baja un host viejo no deje a
 * la aplicacion sin dialogos.
 */

/*
 * `vi.stubGlobal` y no `vi.spyOn(window, 'confirm')`: el entorno de test no trae
 * esas funciones -no hay navegador de verdad detras- y espiar algo indefinido
 * falla. Stubear las define y las quita.
 */
function fingirNativo(nombre: 'confirm' | 'alert', respuesta?: boolean) {
  const doble = vi.fn(() => respuesta);
  vi.stubGlobal(nombre, doble);
  return doble;
}

afterEach(() => {
  resetHostDeDialogos();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sin host montado', () => {
  test('la confirmacion cae al dialogo del navegador y devuelve su respuesta', async () => {
    const nativo = fingirNativo('confirm', false);

    await expect(pedirConfirmacion('¿Borrar?')).resolves.toBe(false);
    expect(nativo).toHaveBeenCalledWith('¿Borrar?');
  });

  test('NO se asume que el usuario acepto', async () => {
    // El fallo que este test existe para impedir: si el puente resolviera `true`
    // por comodidad, toda accion destructiva se ejecutaria sin preguntar durante
    // el rato en que no hay host -antes de montar, o tras un error del arbol-.
    fingirNativo('confirm', false);
    const borrar = vi.fn();

    if (await pedirConfirmacion('¿Borrar?')) borrar();

    expect(borrar).not.toHaveBeenCalled();
  });

  test('el aviso tampoco se traga: se muestra', async () => {
    const nativo = fingirNativo('alert');

    await pedirAviso('Se acabó el plan');

    expect(nativo).toHaveBeenCalledWith('Se acabó el plan');
  });
});

describe('con host montado', () => {
  test('no se toca el dialogo del navegador', async () => {
    const nativo = fingirNativo('confirm', true);
    registrarHostDeDialogos((s) => s.responder(true));

    await pedirConfirmacion('¿Borrar?');

    expect(nativo).not.toHaveBeenCalled();
  });

  test('las opciones llegan tal cual al dialogo', async () => {
    let recibida: SolicitudDeDialogo | null = null;
    registrarHostDeDialogos((s) => {
      recibida = s;
      s.responder(true);
    });

    await pedirConfirmacion('No se puede deshacer.', {
      title: '¿Eliminar?',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });

    expect(recibida).toMatchObject({
      tipo: 'confirm',
      mensaje: 'No se puede deshacer.',
      titulo: '¿Eliminar?',
      rotuloConfirmar: 'Eliminar',
      tono: 'danger',
    });
  });

  test('dos peticiones en vuelo reciben cada una SU respuesta', async () => {
    // `window.confirm` bloqueaba el hilo, asi que esto no podia pasar. Con el
    // puerto asincrono si, y confundir las promesas significaria borrar lo que
    // el usuario dijo que no.
    const pendientes: SolicitudDeDialogo[] = [];
    registrarHostDeDialogos((s) => pendientes.push(s));

    const primera = pedirConfirmacion('¿Borrar A?');
    const segunda = pedirConfirmacion('¿Borrar B?');

    expect(pendientes).toHaveLength(2);
    // Se contestan al reves de como llegaron, que es lo que fuerza el error si
    // el puente guardara una sola respuesta.
    pendientes[1]!.responder(true);
    pendientes[0]!.responder(false);

    await expect(primera).resolves.toBe(false);
    await expect(segunda).resolves.toBe(true);
  });

  test('cada solicitud lleva un id distinto', () => {
    const ids: number[] = [];
    registrarHostDeDialogos((s) => ids.push(s.id));

    void pedirConfirmacion('A');
    void pedirConfirmacion('B');

    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe('alta y baja del host', () => {
  test('dar de baja deja el puente sin host', () => {
    const baja = registrarHostDeDialogos(() => {});
    expect(hayHostDeDialogos()).toBe(true);

    baja();

    expect(hayHostDeDialogos()).toBe(false);
  });

  test('la baja de un host viejo no desconecta al que lo reemplazo', () => {
    // El modo estricto de React monta, desmonta y vuelve a montar. Si la
    // limpieza del primer montaje borrara el registro del segundo, la
    // aplicacion se quedaria sin dialogos propios sin ningun sintoma visible.
    const bajaDelViejo = registrarHostDeDialogos(() => {});
    registrarHostDeDialogos(() => {});

    bajaDelViejo();

    expect(hayHostDeDialogos()).toBe(true);
  });
});
