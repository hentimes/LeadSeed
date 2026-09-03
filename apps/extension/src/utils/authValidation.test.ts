import { describe, it, expect } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  OTP_MAX_LENGTH,
  normalizeOtpCode,
  validateEmail,
  validateFullName,
  validateOtpCode,
  validatePassword,
} from './authValidation';

describe('validateEmail', () => {
  it('acepta una direccion normal', () => {
    expect(validateEmail('alguien@ejemplo.com')).toBeNull();
  });

  it('ignora los espacios de alrededor', () => {
    expect(validateEmail('  alguien@ejemplo.com  ')).toBeNull();
  });

  it('pide el correo cuando esta vacio o en blanco', () => {
    expect(validateEmail('')).toBe('Escribe tu correo.');
    expect(validateEmail('   ')).toBe('Escribe tu correo.');
  });

  it('rechaza los errores de tecleo evidentes', () => {
    expect(validateEmail('alguien')).not.toBeNull();
    expect(validateEmail('alguien@')).not.toBeNull();
    expect(validateEmail('alguien@ejemplo')).not.toBeNull();
    expect(validateEmail('con espacio@ejemplo.com')).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('acepta una que cumple los cuatro requisitos', () => {
    expect(validatePassword('Contrasena1')).toBeNull();
  });

  it('exige la longitud minima del servidor', () => {
    const corta = 'Abc123def'; // 9 caracteres, uno menos del minimo
    expect(corta.length).toBe(MIN_PASSWORD_LENGTH - 1);
    expect(validatePassword(corta)).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it('exige minuscula, mayuscula y numero por separado', () => {
    expect(validatePassword('CONTRASENA1')).toBe('La contrasena necesita alguna minuscula.');
    expect(validatePassword('contrasena1')).toBe('La contrasena necesita alguna mayuscula.');
    expect(validatePassword('Contrasenaa')).toBe('La contrasena necesita algun numero.');
  });

  it('no exige simbolos', () => {
    expect(validatePassword('Contrasena1')).toBeNull();
  });

  it('acepta simbolos si el usuario los pone', () => {
    expect(validatePassword('Contrasena1!@#')).toBeNull();
  });
});

describe('validateFullName', () => {
  it('acepta un nombre corriente', () => {
    expect(validateFullName('Ana Perez')).toBeNull();
  });

  it('rechaza vacio y de una sola letra', () => {
    expect(validateFullName('   ')).toBe('Escribe tu nombre.');
    expect(validateFullName('A')).toBe('Ese nombre es demasiado corto.');
  });
});

describe('normalizeOtpCode', () => {
  it('quita todo lo que no sea digito', () => {
    expect(normalizeOtpCode('12 34-56')).toBe('123456');
  });

  it('tolera el codigo pegado desde el correo con espacios y salto de linea', () => {
    expect(normalizeOtpCode('\n 12345678 \n')).toBe('12345678');
  });

  it('no recorta un codigo de ocho digitos', () => {
    expect(normalizeOtpCode('12345678')).toBe('12345678');
  });

  it('recorta solo lo que pasa del maximo', () => {
    expect(normalizeOtpCode('123456789012345')).toHaveLength(OTP_MAX_LENGTH);
  });

  it('devuelve cadena vacia si no habia ningun digito', () => {
    expect(normalizeOtpCode('abc')).toBe('');
  });
});

describe('validateOtpCode', () => {
  // Produccion emite codigos de OCHO digitos aunque config.toml declare seis.
  // Clavar una longitud fija en el cliente rompia la verificacion entera, y no
  // se veia en los tests porque todos usaban un '123456' inventado.
  it('acepta los ocho digitos que emite el servidor de verdad', () => {
    expect(validateOtpCode('12345678')).toBeNull();
  });

  it('acepta tambien seis, por si se cambia el ajuste', () => {
    expect(validateOtpCode('123456')).toBeNull();
  });

  it('acepta el codigo con basura alrededor, porque se normaliza antes', () => {
    expect(validateOtpCode(' 1234 5678 ')).toBeNull();
  });

  it('pide el codigo cuando no hay ningun digito', () => {
    expect(validateOtpCode('')).toBe('Escribe el codigo que te llego por correo.');
    expect(validateOtpCode('abcdef')).toBe('Escribe el codigo que te llego por correo.');
  });

  it('avisa cuando el codigo esta claramente incompleto', () => {
    expect(validateOtpCode('12345')).toBe('Ese codigo esta incompleto.');
  });
});
