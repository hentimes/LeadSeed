import { describe, expect, test } from 'vitest';
import { decidirAnclaje, type Medidas } from './dropdownAnchor';

/** Medidas reales del desplegable de variables en el sidepanel. */
const MEDIDAS: Medidas = { ancho: 128, alto: 240, margen: 8, ventanaAlto: 900 };

describe('decidirAnclaje', () => {
  test('boton pegado al borde izquierdo: abre hacia la derecha', () => {
    // El caso que fallaba en el editor de plantillas. El boton { } termina en
    // x=80, asi que anclado a la derecha el panel empezaria en -48.
    expect(decidirAnclaje({ right: 80, bottom: 300 }, MEDIDAS).horizontal).toBe('left');
  });

  test('boton a la derecha del panel: abre hacia la izquierda', () => {
    // El caso del compositor de envio, donde el boton va en la esquina derecha.
    expect(decidirAnclaje({ right: 560, bottom: 300 }, MEDIDAS).horizontal).toBe('right');
  });

  test('justo en el limite del margen se prefiere abrir hacia la derecha', () => {
    // right - ancho = 135 - 128 = 7, que es menos que el margen de 8.
    expect(decidirAnclaje({ right: 135, bottom: 300 }, MEDIDAS).horizontal).toBe('left');
    // 136 - 128 = 8, que ya cabe.
    expect(decidirAnclaje({ right: 136, bottom: 300 }, MEDIDAS).horizontal).toBe('right');
  });

  test('con sitio debajo, despliega hacia abajo', () => {
    expect(decidirAnclaje({ right: 560, bottom: 100 }, MEDIDAS).vertical).toBe('down');
  });

  test('cerca del fondo, despliega hacia arriba', () => {
    // Quedan 100px y el panel mide 240.
    expect(decidirAnclaje({ right: 560, bottom: 800 }, MEDIDAS).vertical).toBe('up');
  });

  test('los dos ejes se deciden por separado', () => {
    // Boton abajo a la izquierda: tiene que abrir hacia arriba Y hacia la derecha.
    expect(decidirAnclaje({ right: 80, bottom: 800 }, MEDIDAS)).toEqual({
      horizontal: 'left',
      vertical: 'up',
    });
  });
});
