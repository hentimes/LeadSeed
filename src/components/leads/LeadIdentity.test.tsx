import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LeadIdentity from './LeadIdentity';
import { SIN_NOMBRE } from '../../utils/leadDisplay';

/*
 * Primer test de componente del repositorio. La limpieza va a mano porque
 * `vitest.config.ts` no activa `globals`, y sin globales React Testing Library
 * no puede registrar su `afterEach` automatico: sin esto, cada render se
 * acumularia en el mismo documento y `getByText` encontraria duplicados.
 */
afterEach(cleanup);

describe('LeadIdentity', () => {
  it('pinta el nombre del lead', () => {
    render(<LeadIdentity name="Henry Farias" />);
    expect(screen.getByText('Henry Farias')).toBeTruthy();
  });

  describe('cuando el lead no tiene nombre', () => {
    /*
     * Cuatro de las siete listas no tenian respaldo y dejaban la celda vacia:
     * invisible para quien mira y silenciosa para un lector de pantalla. El
     * respaldo se aplica aqui dentro justamente para que ninguna lista pueda
     * volver a olvidarlo.
     */
    it('pinta el respaldo aunque quien llama no lo resuelva', () => {
      render(<LeadIdentity name="" />);
      expect(screen.getByText(SIN_NOMBRE)).toBeTruthy();
    });

    it('tambien con un nombre de solo espacios', () => {
      render(<LeadIdentity name="   " />);
      expect(screen.getByText(SIN_NOMBRE)).toBeTruthy();
    });

    /*
     * Con el mismo peso que un nombre real, "Sin nombre" se lee como si alguien
     * se llamara asi. Atenuado se lee como lo que es: un dato que falta.
     */
    it('lo atenua para que no se lea como un nombre real', () => {
      render(<LeadIdentity name="" />);
      const respaldo = screen.getByText(SIN_NOMBRE);
      expect(respaldo.className).toContain('italic');
      expect(respaldo.className).toContain('text-ink-muted');
    });

    it('no atenua un nombre de verdad', () => {
      render(<LeadIdentity name="Betzabeth" />);
      const nombre = screen.getByText('Betzabeth');
      expect(nombre.className).not.toContain('italic');
      expect(nombre.className).toContain('text-ink');
    });
  });

  describe('huecos opcionales', () => {
    /*
     * Envio masivo y flujos no muestran avatar. Si la primitiva reservara su
     * ancho igualmente, esas dos listas pagarian en un panel de 360px por algo
     * que no pintan.
     */
    it('no reserva el hueco del avatar si no se pasa', () => {
      const { container } = render(<LeadIdentity name="Ana Soto" />);
      const raiz = container.firstElementChild as HTMLElement;
      // Un solo hijo: la columna de texto. Si reservara hueco serian dos.
      expect(raiz.children.length).toBe(1);
    });

    it('anade un hueco cuando si hay avatar', () => {
      const { container } = render(
        <LeadIdentity name="Ana Soto" avatar={<span data-prueba="avatar">AS</span>} />
      );
      const raiz = container.firstElementChild as HTMLElement;
      expect(raiz.children.length).toBe(2);
    });

    it('pinta el avatar que le den', () => {
      render(<LeadIdentity name="Ana Soto" avatar={<span data-prueba="avatar">AS</span>} />);
      expect(screen.getByText('AS')).toBeTruthy();
    });

    it('no pinta la linea secundaria si no se pasa', () => {
      const { container } = render(<LeadIdentity name="Ana Soto" />);
      expect(container.textContent).toBe('Ana Soto');
    });

    it('no pinta la linea secundaria si viene vacia', () => {
      const { container } = render(<LeadIdentity name="Ana Soto" caption="" />);
      expect(container.textContent).toBe('Ana Soto');
    });

    it('pinta la linea secundaria cuando la hay', () => {
      render(<LeadIdentity name="Ana Soto" caption="RUT: 12.345.678-9" />);
      expect(screen.getByText('RUT: 12.345.678-9')).toBeTruthy();
    });

    it('pinta los distintivos junto al nombre', () => {
      render(<LeadIdentity name="Ana Soto" badges={<span>3</span>} />);
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('densidad', () => {
    it('usa una separacion distinta en compacta que en normal', () => {
      const { container: compacta } = render(<LeadIdentity name="Ana" density="compact" />);
      const claseCompacta = compacta.firstElementChild?.className ?? '';
      cleanup();

      const { container: normal } = render(<LeadIdentity name="Ana" density="normal" />);
      const claseNormal = normal.firstElementChild?.className ?? '';

      expect(claseCompacta).not.toBe(claseNormal);
    });

    it('por defecto es normal', () => {
      const { container: porDefecto } = render(<LeadIdentity name="Ana" />);
      const clasePorDefecto = porDefecto.firstElementChild?.className ?? '';
      cleanup();

      const { container: normal } = render(<LeadIdentity name="Ana" density="normal" />);
      const claseNormal = normal.firstElementChild?.className ?? '';

      expect(clasePorDefecto).toBe(claseNormal);
      // Que no sea la cadena vacia comparandose consigo misma.
      expect(clasePorDefecto).toContain('gap-2');
    });
  });

  /*
   * El nombre y la linea secundaria compiten por el ancho en un panel de 360px.
   * Sin `truncate` y `min-w-0` en la cadena de contenedores, un nombre largo
   * empuja la fila fuera de la tarjeta en vez de recortarse: es el mismo fallo
   * que se acaba de corregir en el panel analitico.
   */
  it('deja que el nombre se recorte en vez de empujar la fila', () => {
    render(<LeadIdentity name="Maria Jose Rebolledo Kehr" />);
    const nombre = screen.getByText('Maria Jose Rebolledo Kehr');
    expect(nombre.className).toContain('truncate');
  });

  it('permite encoger a toda la cadena de contenedores', () => {
    const { container } = render(<LeadIdentity name="Ana Soto" caption="empresa" />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain('min-w-0');
    const columna = raiz.querySelector('.flex.flex-col') as HTMLElement;
    expect(columna.className).toContain('min-w-0');
  });
});
