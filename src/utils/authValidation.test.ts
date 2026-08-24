import { describe, it, expect } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  OTP_LENGTH,
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
    expect(normalizeOtpCode('\n 123456 \n')).toBe('123456');
  });

  it('recorta lo que sobra', () => {
    expect(normalizeOtpCode('1234567890')).toBe('123456');
    expect(normalizeOtpCode('1234567890')).toHaveLength(OTP_LENGTH);
  });

  it('devuelve cadena vacia si no habia ningun digito', () => {
    expect(normalizeOtpCode('abc')).toBe('');
  });
});

describe('validateOtpCode', () => {
  it('acepta seis digitos', () => {
    expect(validateOtpCode('123456')).toBeNull();
  });

  it('acepta seis digitos con basura alrededor, porque se normaliza antes', () => {
    expect(validateOtpCode(' 123 456 ')).toBeNull();
  });

  it('pide el codigo cuando no hay ningun digito', () => {
    expect(validateOtpCode('')).toBe('Escribe el codigo que te llego por correo.');
    expect(validateOtpCode('abcdef')).toBe('Escribe el codigo que te llego por correo.');
  });

  it('avisa cuando faltan digitos', () => {
    expect(validateOtpCode('12345')).toBe(`El codigo tiene ${OTP_LENGTH} digitos.`);
  });
});
