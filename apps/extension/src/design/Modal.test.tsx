import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

afterEach(cleanup);

/**
 * EL FOCO NO SE PUEDE MOVER EN CADA RENDER
 *
 * El bug que estos tests existen para impedir se veia asi: al escribir dentro de
 * un dialogo, cada caracter mandaba el foco al boton de cerrar y no se podia
 * escribir nada.
 *
 * La causa era una dependencia. El efecto que enfoca al abrir dependia de
 * `[onClose]`, y casi todos los llamadores pasan una flecha en linea, que es una
 * funcion distinta en cada render del padre. Con el texto del campo viviendo en
 * ese padre -lo normal en este proyecto- la cadena se cerraba sola:
 *
 *   tecla -> setState arriba -> repinta -> nuevo `onClose` -> el efecto corre
 *   otra vez -> enfoca el primer elemento del panel, que es la X.
 *
 * Es invisible para TypeScript y para el lint: la firma no cambia y el codigo
 * "funciona". Solo se nota usandolo, y por eso hace falta el test.
 */
describe('Modal: el foco al reabrir el efecto', () => {
  it('no devuelve el foco al primer control cuando cambia la identidad de onClose', () => {
    const { rerender } = render(
      <Modal onClose={() => {}} label="Motivos">
        <button type="button">Cerrar</button>
        <input aria-label="texto" />
      </Modal>,
    );

    const campo = screen.getByLabelText('texto');
    campo.focus();
    expect(document.activeElement).toBe(campo);

    // Exactamente lo que hace el padre al repintar: una flecha nueva.
    rerender(
      <Modal onClose={() => {}} label="Motivos">
        <button type="button">Cerrar</button>
        <input aria-label="texto" />
      </Modal>,
    );

    expect(document.activeElement).toBe(campo);
  });

  it('escribir varios caracteres deja el foco en el campo', () => {
    // La reproduccion del sintoma tal como se reporto: cada tecla repinta el
    // padre, y si el foco se escapara el valor se perderia a mitad de camino.
    const { rerender } = render(
      <Modal onClose={() => {}} label="Motivos">
        <button type="button">Cerrar</button>
        <input aria-label="texto" defaultValue="" />
      </Modal>,
    );

    const campo = screen.getByLabelText('texto') as HTMLInputElement;
    campo.focus();

    for (const letra of 'hola') {
      fireEvent.change(campo, { target: { value: campo.value + letra } });
      // Cada tecla repinta el padre en la aplicacion real; se simula igual.
      rerender(
        <Modal onClose={() => {}} label="Motivos">
          <button type="button">Cerrar</button>
          <input aria-label="texto" defaultValue="" />
        </Modal>,
      );
      expect(document.activeElement).toBe(campo);
    }

    expect(campo.value).toBe('hola');
  });

  it('enfoca el primer control al montar', () => {
    // Lo que el efecto SI tiene que seguir haciendo: sin esto, quien navega con
    // teclado abre el dialogo y el foco se queda detras del velo.
    render(
      <Modal onClose={() => {}} label="Motivos">
        <button type="button">Cerrar</button>
        <input aria-label="texto" />
      </Modal>,
    );

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
  });

  it('Escape usa el onClose vigente, no el del primer render', () => {
    // La contrapartida de guardar `onClose` en una ref: si se congelara el del
    // montaje, Escape llamaria a una version obsoleta.
    const viejo = vi.fn();
    const nuevo = vi.fn();

    const { rerender } = render(
      <Modal onClose={viejo} label="Motivos">
        <button type="button">Cerrar</button>
      </Modal>,
    );

    rerender(
      <Modal onClose={nuevo} label="Motivos">
        <button type="button">Cerrar</button>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(nuevo).toHaveBeenCalledOnce();
    expect(viejo).not.toHaveBeenCalled();
  });
});
