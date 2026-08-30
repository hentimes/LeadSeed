import { describe, it, expect } from 'vitest';
import { inicialesDe, avatarDeIniciales, avatarUrl } from './avatar';

describe('inicialesDe', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(inicialesDe('Ana Perez')).toBe('AP');
  });

  it('ignora las palabras a partir de la tercera', () => {
    expect(inicialesDe('Maria Jose Garcia Lopez')).toBe('MJ');
  });

  it('devuelve una sola inicial si hay una sola palabra', () => {
    expect(inicialesDe('Henry')).toBe('H');
  });

  it('pone en mayuscula lo que venia en minuscula', () => {
    expect(inicialesDe('ana perez')).toBe('AP');
  });

  it('conserva los acentos en vez de romperlos', () => {
    expect(inicialesDe('Ángela Ñuñez')).toBe('ÁÑ');
  });

  it('devuelve ? cuando el nombre esta vacio', () => {
    expect(inicialesDe('   ')).toBe('?');
  });

  it('descarta trozos sin letras, como un correo suelto o un guion', () => {
    expect(inicialesDe('- Ana')).toBe('A');
  });
});

describe('avatarDeIniciales', () => {
  it('produce un data URI de SVG', () => {
    expect(avatarDeIniciales('Ana Perez')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it('mete las iniciales dentro del svg', () => {
    expect(decodeURIComponent(avatarDeIniciales('Ana Perez'))).toContain('>AP<');
  });

  it('escapa el ampersand para no romper el svg', () => {
    // `&` es una palabra con letra? no: se descarta, pero si llegara suelto
    // no debe salir crudo dentro del marcado.
    const svg = decodeURIComponent(avatarDeIniciales('Ana & Co'));
    expect(svg).not.toMatch(/>[^<]*&[^a][^<]*</);
  });

  it('no pide nada a la red', () => {
    // El `xmlns` del SVG es `http://www.w3.org/2000/svg`, que es un
    // identificador de espacio de nombres y no una descarga. Lo que importa es
    // que el propio avatar viaje dentro del documento.
    const url = avatarDeIniciales('Ana');
    expect(url.startsWith('data:')).toBe(true);
    expect(url).not.toContain('ui-avatars');
  });
});

describe('avatarUrl', () => {
  it('prefiere la foto real cuando existe', () => {
    expect(avatarUrl('Ana', 'https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
  });

  it('cae a las iniciales cuando no hay foto', () => {
    expect(avatarUrl('Ana', null)).toMatch(/^data:image\/svg/);
  });

  it('no revienta cuando el nombre es nulo', () => {
    expect(avatarUrl(null, null)).toMatch(/^data:image\/svg/);
  });
});
