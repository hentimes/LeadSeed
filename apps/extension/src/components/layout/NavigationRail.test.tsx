import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NavigationRail from './NavigationRail';
import { resetCloseOnEscapeForTesting } from '../../hooks/useCloseOnEscape';

// El rail solo consulta `hasFeature` del contexto de sesion. Montar el
// proveedor entero arrastraria el cliente de Supabase a un test de interfaz.
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasFeature: () => true }),
}));

afterEach(() => {
  cleanup();
  resetCloseOnEscapeForTesting();
  localStorage.clear();
});

beforeEach(() => {
  window.location.hash = '';
});

function montar(props: Partial<Parameters<typeof NavigationRail>[0]> = {}) {
  const onNavigate = vi.fn();
  render(
    <NavigationRail currentPage="leads" onNavigate={onNavigate} {...props} />,
  );
  return { onNavigate };
}

describe('NavigationRail', () => {
  it('marca la pagina actual con aria-current', () => {
    montar({ currentPage: 'dashboard' });
    expect(screen.getByRole('button', { name: 'Dashboard' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Leads' }).getAttribute('aria-current')).toBeNull();
  });

  it('navega al pulsar un destino', () => {
    const { onNavigate } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
    expect(onNavigate).toHaveBeenCalledWith('agenda');
  });

  /*
   * El numero se ve, pero un lector de pantalla no lee un circulo rojo: el
   * contador tiene que viajar tambien en el nombre accesible del boton.
   */
  it('lleva el contador al nombre accesible', () => {
    montar({ taskCount: 7 });
    expect(screen.getByRole('button', { name: 'Tareas, 7 sin leer' })).toBeTruthy();
  });

  /*
   * Con el rail contraido el numero tiene que verse igual, como en las
   * notificaciones del movil: un punto rojo dice que pasa algo pero no cuanto.
   */
  it('pinta el contador tambien con el rail contraido', () => {
    montar({ taskCount: 7 });
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('corta el contador contraido en 99+', () => {
    montar({ taskCount: 128 });
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('anuncia el chat suspendido en lugar del contador', () => {
    montar({ isChatBanned: true, unreadChatCount: 3 });
    expect(screen.getByRole('button', { name: 'Chat, cuenta suspendida' })).toBeTruthy();
  });

  /*
   * Las cuatro pruebas que habia aqui verificaban el submenu flotante del
   * rail. Ese submenu ya no existe: sus destinos se pintan como pestanas en la
   * propia pagina. Lo que queda por comprobar es lo que lo sustituye.
   */
  it('la entrada de un grupo lleva a su pagina de entrada', () => {
    const { onNavigate } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Mensajes' }));
    expect(onNavigate).toHaveBeenCalledWith('send');
  });

  /*
   * El resaltado es del GRUPO, no de la pagina. Estando en Flujos, una entrada
   * que resaltara por pagina o no marcaria nada, o marcaria "Enviar" mientras
   * miras otra cosa.
   */
  it('marca el grupo desde cualquiera de sus paginas', () => {
    montar({ currentPage: 'flows' });
    expect(screen.getByRole('button', { name: 'Mensajes' }).getAttribute('aria-current')).toBe('page');
  });

  it('Ajustes es una entrada normal y navega sin hash', () => {
    const { onNavigate } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
    // El hash lo escribe ahora la propia pagina al elegir pestana. Que el rail
    // no lo toque es lo que permite volver a la seccion donde lo dejaste.
    expect(window.location.hash).toBe('');
  });

  it('marca Ajustes cuando es la pagina actual', () => {
    montar({ currentPage: 'settings' });
    expect(screen.getByRole('button', { name: 'Ajustes' }).getAttribute('aria-current')).toBe('page');
  });

  it('el rail se puede expandir y contraer', () => {
    montar();
    const toggle = screen.getByRole('button', { name: 'Expandir el menú' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    const contraer = screen.getByRole('button', { name: 'Contraer el menú' });
    expect(contraer.getAttribute('aria-expanded')).toBe('true');
  });

  it('Escape contrae el rail expandido', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir el menú' }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Expandir el menú' })).toBeTruthy();
  });

  it('al navegar deja el rail contraido', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir el menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leads' }));

    expect(screen.getByRole('button', { name: 'Expandir el menú' })).toBeTruthy();
  });
});
