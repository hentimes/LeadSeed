import { describe, it, expect } from 'vitest';
import { tieneTelefonoValido, tieneCorreoValido, puedeRecibirPor } from './leadContacto';

const conTelefono = (phone: string) => ({ phone });
const conCorreo = (email: string) => ({ email });

describe('tieneTelefonoValido', () => {
  it('acepta un movil chileno de nueve digitos', () => {
    expect(tieneTelefonoValido(conTelefono('998765874'))).toBe(true);
  });

  it('acepta el mismo numero con prefijo internacional', () => {
    expect(tieneTelefonoValido(conTelefono('+56981377026'))).toBe(true);
  });

  it('acepta un numero con espacios y guiones', () => {
    expect(tieneTelefonoValido(conTelefono('+56 9 8137 7026'))).toBe(true);
  });

  /* Las reglas salen de `normalizePhone`, que es donde viven desde antes. */
  it('rechaza un numero demasiado corto', () => {
    expect(tieneTelefonoValido(conTelefono('12345'))).toBe(false);
  });

  it('rechaza nueve digitos que no empiezan en 9', () => {
    expect(tieneTelefonoValido(conTelefono('223456789'))).toBe(false);
  });

  it('rechaza diez digitos, que no son formato chileno', () => {
    expect(tieneTelefonoValido(conTelefono('9876543210'))).toBe(false);
  });

  it('rechaza el vacio y el ausente', () => {
    expect(tieneTelefonoValido(conTelefono(''))).toBe(false);
    expect(tieneTelefonoValido({ phone: undefined as unknown as string })).toBe(false);
  });
});

describe('tieneCorreoValido', () => {
  it('acepta un correo corriente', () => {
    expect(tieneCorreoValido(conCorreo('ana@example.com'))).toBe(true);
  });

  it('acepta subdominios', () => {
    expect(tieneCorreoValido(conCorreo('ana@correo.empresa.cl'))).toBe(true);
  });

  it('recorta espacios de los bordes', () => {
    expect(tieneCorreoValido(conCorreo('  ana@example.com  '))).toBe(true);
  });

  /* Los casos que motivaron la comprobacion: se enviaba a esto. */
  it('rechaza un nombre suelto', () => {
    expect(tieneCorreoValido(conCorreo('juan'))).toBe(false);
  });

  it('rechaza una arroba sin dominio', () => {
    expect(tieneCorreoValido(conCorreo('juan@'))).toBe(false);
  });

  it('rechaza un dominio sin punto', () => {
    expect(tieneCorreoValido(conCorreo('juan@empresa'))).toBe(false);
  });

  it('rechaza dos arrobas', () => {
    expect(tieneCorreoValido(conCorreo('a@b@c.com'))).toBe(false);
  });

  it('rechaza espacios en medio', () => {
    expect(tieneCorreoValido(conCorreo('ana perez@example.com'))).toBe(false);
  });

  it('rechaza el vacio y el ausente', () => {
    expect(tieneCorreoValido(conCorreo(''))).toBe(false);
    expect(tieneCorreoValido({ email: undefined as unknown as string })).toBe(false);
  });
});

describe('puedeRecibirPor', () => {
  const conTodo = { phone: '998765874', email: 'ana@example.com' };
  const soloTelefono = { phone: '998765874', email: '' };
  const soloCorreo = { phone: '', email: 'ana@example.com' };

  it('whatsapp y llamadas miran el telefono', () => {
    expect(puedeRecibirPor(soloTelefono, 'whatsapp')).toBe(true);
    expect(puedeRecibirPor(soloTelefono, 'call')).toBe(true);
    expect(puedeRecibirPor(soloCorreo, 'whatsapp')).toBe(false);
    expect(puedeRecibirPor(soloCorreo, 'call')).toBe(false);
  });

  it('email mira el correo', () => {
    expect(puedeRecibirPor(soloCorreo, 'email')).toBe(true);
    expect(puedeRecibirPor(soloTelefono, 'email')).toBe(false);
  });

  it('quien tiene los dos datos sirve para los tres canales', () => {
    expect(puedeRecibirPor(conTodo, 'whatsapp')).toBe(true);
    expect(puedeRecibirPor(conTodo, 'call')).toBe(true);
    expect(puedeRecibirPor(conTodo, 'email')).toBe(true);
  });
});
