/**
 * Normaliza un RUT chileno a formato estándar: XXXXXXXX-D
 * Soporta múltiples formatos de entrada:
 *   - "12345678" + DV "9" → "12345678-9"
 *   - "12345678-9" → "12345678-9"
 *   - "123456789" (DV como último dígito) → "12345678-9"
 *   - "12.345.678-9" (con puntos) → "12345678-9"
 *   - "12,345,678-9" (con comas) → "12345678-9"
 *   - "12,345,6789" (comas + DV pegado) → "12345678-9"
 */

export interface RutParts {
  rut: string;    // número base (sin DV)
  dv: string;     // dígito verificador
}

export function normalizeRut(rutStr: string, dvStr?: string): string | null {
  if (!rutStr && !dvStr) return null;

  let combined = '';

  if (rutStr) {
    // Si hay un DV separado, unir con guion para procesar juntos
    combined = dvStr ? `${rutStr}-${dvStr}` : rutStr;
  } else if (dvStr) {
    combined = dvStr;
  }

  // Limpiar: eliminar todo excepto dígitos, K/k, y guiones
  // Pero preservar el último guion como separador de DV
  let clean = combined.replace(/[^0-9kK-]/g, '');

  if (!clean) return null;

  // Si no hay guion, el último carácter es el DV si hay más de 8 dígitos
  let body = '';
  let dv = '';

  const dashIndex = clean.lastIndexOf('-');
  if (dashIndex !== -1) {
    body = clean.substring(0, dashIndex).replace(/-/g, '');
    dv = clean.substring(dashIndex + 1).replace(/-/g, '');
  } else {
    // Sin guion: detectar si el último carácter es K (DV)
    const lastChar = clean.charAt(clean.length - 1).toUpperCase();
    if (lastChar === 'K') {
      body = clean.substring(0, clean.length - 1).replace(/[^0-9]/g, '');
      dv = 'K';
    } else {
      const digitsOnly = clean.replace(/[^0-9]/g, '');
      if (digitsOnly.length <= 8) {
        body = digitsOnly;
        dv = '';
      } else {
        // Más de 8 dígitos → el último es el DV
        body = digitsOnly.substring(0, digitsOnly.length - 1);
        dv = digitsOnly.substring(digitsOnly.length - 1);
      }
    }
  }

  // Limpiar body de cualquier residuo
  body = body.replace(/[^0-9]/g, '');

  // Limpiar DV
  dv = dv.replace(/[^0-9kK]/g, '').toUpperCase();

  // Validar que el body tenga entre 6 y 9 dígitos
  if (body.length < 6 || body.length > 9) return null;

  // Si no hay DV, devolver solo el cuerpo (sin DV)
  if (!dv) {
    return body;
  }

  // Tomar solo el primer carácter del DV si tiene más de uno
  dv = dv.charAt(0);

  return `${body}-${dv}`;
}

export function parseRut(rutStr: string, dvStr?: string): RutParts | null {
  const normalized = normalizeRut(rutStr, dvStr);
  if (!normalized) return null;

  const parts = normalized.split('-');
  return {
    rut: parts[0],
    dv: parts.length > 1 ? parts[1] : '',
  };
}

export function formatRutDisplay(rut: string): string {
  // Formatea como 12.345.678-9
  const clean = rut.replace(/[^0-9kK-]/g, '');
  const dashIdx = clean.lastIndexOf('-');
  const body = dashIdx !== -1 ? clean.substring(0, dashIdx) : clean;
  const dv = dashIdx !== -1 ? clean.substring(dashIdx + 1) : '';

  // Insertar puntos cada 3 dígitos desde la derecha
  const reversed = body.split('').reverse();
  const withDots: string[] = [];
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) withDots.push('.');
    withDots.push(reversed[i]);
  }
  const formatted = withDots.reverse().join('');

  return dv ? `${formatted}-${dv}` : formatted;
}
