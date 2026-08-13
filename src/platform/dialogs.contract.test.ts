import { describe, expect, test, vi } from 'vitest';
import type { DialogsPort } from './types';

/**
 * Contrato de los dialogos, verificado sobre el patron de uso real.
 *
 * Contexto: los diez `confirm()` y `alert()` sincronos de la capa de dominio se
 * convirtieron a un puerto asincrono. La auditoria del `2026-08-12` marco como
 * hueco critico que ese refactor no tuviera ninguna red: si un llamador se
 * quedara sin `await`, `if (!confirmar(...))` evaluaria una Promise, que siempre
 * es truthy, la negacion siempre seria falsa y **la accion destructiva se
 * ejecutaria sin preguntar**.
 *
 * Un test de integracion sobre `useLeadsPageController` seria lo ideal, pero
 * ese hook arrastra Supabase, autenticacion y una decena de hooks. Lo que si se
 * puede fijar hoy, y es donde vive el riesgo, es la forma del patron: que
 * `await` mas negacion cortan el flujo y que su ausencia no lo hace.
 *
 * Estos tests documentan por que el patron correcto es obligatorio y fallarian
 * si alguien "simplificara" el puerto devolviendo un booleano sincrono.
 */

function dialogosFalsos(respuesta: boolean): DialogsPort {
  return {
    confirm: vi.fn(async () => respuesta),
    alert: vi.fn(async () => {}),
  };
}

/** Reproduce el patron que usan `handleDelete` y sus hermanos. */
async function accionDestructiva(dialogs: DialogsPort, ejecutar: () => void) {
  if (!(await dialogs.confirm('Eliminar definitivamente?'))) return 'cancelado';
  ejecutar();
  return 'ejecutado';
}

describe('contrato de confirmacion antes de una accion destructiva', () => {
  test('si el usuario acepta, la accion se ejecuta', async () => {
    const ejecutar = vi.fn();

    await expect(accionDestructiva(dialogosFalsos(true), ejecutar)).resolves.toBe('ejecutado');
    expect(ejecutar).toHaveBeenCalledOnce();
  });

  test('si el usuario cancela, la accion NO se ejecuta', async () => {
    // Este es el caso que importa: es lo que se romperia si faltara un await.
    const ejecutar = vi.fn();

    await expect(accionDestructiva(dialogosFalsos(false), ejecutar)).resolves.toBe('cancelado');
    expect(ejecutar).not.toHaveBeenCalled();
  });

  test('sin await, la negacion nunca corta: la accion se ejecutaria igual', async () => {
    // Demuestra el fallo concreto, para que quede documentado por que el
    // `await` no es opcional. Una Promise siempre es truthy, asi que `!promesa`
    // siempre es false y el `return` temprano jamas ocurre.
    const dialogs = dialogosFalsos(false);
    const ejecutar = vi.fn();

    const promesa = dialogs.confirm('Eliminar definitivamente?');
    if (!promesa) {
      // Inalcanzable a proposito.
      expect.unreachable('una Promise nunca es falsy');
    }
    ejecutar();

    expect(ejecutar).toHaveBeenCalledOnce();
    await promesa;
  });

  test('se pregunta exactamente una vez por accion', async () => {
    const dialogs = dialogosFalsos(true);

    await accionDestructiva(dialogs, vi.fn());

    expect(dialogs.confirm).toHaveBeenCalledOnce();
  });

  test('el mensaje llega al dialogo tal cual', async () => {
    const dialogs = dialogosFalsos(true);

    await accionDestructiva(dialogs, vi.fn());

    expect(dialogs.confirm).toHaveBeenCalledWith('Eliminar definitivamente?');
  });

  test('una cadena de confirmaciones se corta en la primera negativa', async () => {
    // Patron de `handleBulkDelete`: confirmar y solo entonces cancelar citas.
    const dialogs = dialogosFalsos(false);
    const cancelarCitas = vi.fn();
    const borrar = vi.fn();

    if (await dialogs.confirm('Eliminar 5 leads?')) {
      cancelarCitas();
      borrar();
    }

    expect(cancelarCitas).not.toHaveBeenCalled();
    expect(borrar).not.toHaveBeenCalled();
  });
});
