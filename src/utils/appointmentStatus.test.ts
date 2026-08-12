import { describe, expect, test } from 'vitest';
import { ACTIVE_APPOINTMENT_STATUSES, isActiveAppointment } from './appointmentStatus';

describe('isActiveAppointment', () => {
  test('reconoce los cuatro estados que ocupan el horario', () => {
    expect(isActiveAppointment('pendiente')).toBe(true);
    expect(isActiveAppointment('agendada')).toBe(true);
    expect(isActiveAppointment('confirmada')).toBe(true);
    expect(isActiveAppointment('tentativa')).toBe(true);
  });

  test('rechaza los estados que liberan el slot', () => {
    expect(isActiveAppointment('cancelada')).toBe(false);
    expect(isActiveAppointment('rechazada')).toBe(false);
    expect(isActiveAppointment('completada')).toBe(false);
    expect(isActiveAppointment('no_asistio')).toBe(false);
  });

  test('normaliza mayusculas', () => {
    // Este es el fallo silencioso que motivo extraer el predicado:
    // useLeadDetail comparaba el valor crudo del backend contra un Set en
    // minusculas, asi que una cita activa capitalizada no se encontraba.
    expect(isActiveAppointment('Confirmada')).toBe(true);
    expect(isActiveAppointment('AGENDADA')).toBe(true);
    expect(isActiveAppointment('PeNdIeNtE')).toBe(true);
  });

  test('tolera espacios sobrantes', () => {
    expect(isActiveAppointment('  confirmada  ')).toBe(true);
    expect(isActiveAppointment('\tagendada\n')).toBe(true);
  });

  test('trata como inactivo lo vacio, nulo o indefinido', () => {
    expect(isActiveAppointment('')).toBe(false);
    expect(isActiveAppointment('   ')).toBe(false);
    expect(isActiveAppointment(null)).toBe(false);
    expect(isActiveAppointment(undefined)).toBe(false);
  });

  test('no acepta un estado desconocido', () => {
    expect(isActiveAppointment('inventado')).toBe(false);
  });
});

describe('ACTIVE_APPOINTMENT_STATUSES', () => {
  test('contiene exactamente los cuatro estados activos', () => {
    expect([...ACTIVE_APPOINTMENT_STATUSES].sort()).toEqual([
      'agendada',
      'confirmada',
      'pendiente',
      'tentativa',
    ]);
  });
});
