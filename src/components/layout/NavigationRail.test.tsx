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

  it('abre el submenu como lista y deja el boton marcado como expandido', () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Mensajes' });
    expect(boton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(boton);

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Plantillas' })).toBeTruthy();
  });

  it('navega a la seccion de ajustes con su hash', () => {
    const { onNavigate } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Metas' }));

    expect(window.location.hash).toBe('#goals');
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  /*
   * El cajon anterior comparaba contra `window.location.hash` durante el
   * render sin escuchar `hashchange`, asi que el resaltado se quedaba en la
   * seccion anterior.
   */
  it('sigue el hash cuando cambia fuera del rail', () => {
    montar({ currentPage: 'settings' });
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));

    window.location.hash = '#data';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(screen.getByRole('button', { name: 'Datos' }).getAttribute('aria-current')).toBe('page');
  });

  it('el rail se puede expandir y contraer', () => {
    montar();
    const toggle = screen.getByRole('button', { name: 'Expandir el menú' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    const contraer = screen.getByRole('button', { name: 'Contraer el menú' });
    expect(contraer.getAttribute('aria-expanded')).toBe('true');
  });

  it('el submenu se cierra con Escape sin contraer el rail', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir el menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mensajes' }));
    expect(screen.getByRole('button', { name: 'Plantillas' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Plantillas' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Contraer el menú' })).toBeTruthy();
  });

  it('al navegar deja el rail contraido', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir el menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leads' }));

    expect(screen.getByRole('button', { name: 'Expandir el menú' })).toBeTruthy();
  });
});
