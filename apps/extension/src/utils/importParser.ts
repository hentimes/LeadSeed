import * as XLSX from 'xlsx';
import { normalizeRut } from './rutNormalizer';
import { normalizePhone } from './waHelper';

export interface ParsedRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  rut: string;      // normalizado: 12345678-9
  status?: string;
  [key: string]: string | undefined;
}

export interface DetectedColumn {
  original: string;
  mapped: keyof ParsedRow | null;
}

export function parseJSONFile(file: File): Promise<{ rows: Record<string, string>[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    // DEUDA BLOQUE 5: FileReader no existe en React Native. Esta funcion ya es
    // web-only por otro motivo: depende de `xlsx`, que tampoco cruza. Portar la
    // importacion de archivos es un frente propio, no un puerto. Ver roadmap 13.6.
    // eslint-disable-next-line no-restricted-globals
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const rows: Record<string, string>[] = Array.isArray(data) ? data : [data];
        const primeraFila = rows[0];
        const columns = primeraFila ? Object.keys(primeraFila) : [];
        resolve({ rows, columns });
      } catch {
        reject(new Error('JSON inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

export function parseExcelFile(file: File): Promise<{ rows: Record<string, string>[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    // DEUDA BLOQUE 5: FileReader no existe en React Native. Esta funcion ya es
    // web-only por otro motivo: depende de `xlsx`, que tampoco cruza. Portar la
    // importacion de archivos es un frente propio, no un puerto. Ver roadmap 13.6.
    // eslint-disable-next-line no-restricted-globals
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });

        // Un libro sin hojas es un archivo valido para la libreria pero inutil
        // para importar. Antes se le pasaba `undefined` a sheet_to_json y el
        // fallo salia por el catch como "Excel invalido", que no dice nada:
        // el usuario no sabia si el problema era el formato o el contenido.
        const nombreHoja = wb.SheetNames[0];
        const ws = nombreHoja ? wb.Sheets[nombreHoja] : undefined;
        if (!ws) {
          reject(new Error('El archivo Excel no tiene ninguna hoja con datos'));
          return;
        }

        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        const primeraFila = data[0];
        const columns = primeraFila ? Object.keys(primeraFila) : [];
        resolve({ rows: data, columns });
      } catch {
        reject(new Error('Excel inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function detectMapping(columns: string[]): DetectedColumn[] {
  return columns.map((col) => {
    const lower = col.toLowerCase().trim();

    // Name
    if (lower === 'nombre' || lower === 'name' || lower === 'nombres') {
      return { original: col, mapped: 'name' };
    }
    if (
      lower === 'a-paterno' || lower === 'apellido_paterno' || lower === 'apellidopaterno' ||
      lower === 'paterno' || lower === 'a-materno' || lower === 'apellido_materno' ||
      lower === 'apellidomaterno' || lower === 'materno' ||
      lower.includes('apellido') || lower.includes('a-paterno') || lower.includes('a-materno')
    ) {
      return { original: col, mapped: null }; // parte del nombre
    }

    // Phone
    if (
      lower === 'telefono' || lower === 'teléfono' || lower === 'phone' ||
      lower === 'celular' || lower === 'whatsapp' || lower === 'movil' ||
      lower === 'móvil' || lower === 'fono' || lower === 'tel'
    ) {
      return { original: col, mapped: 'phone' };
    }

    // Email
    if (
      lower === 'email' || lower === 'correo' || lower === 'e-mail' ||
      lower === 'mail' || lower === 'correo electrónico' || lower === 'correoelectronico'
    ) {
      return { original: col, mapped: 'email' };
    }

    // Company
    if (
      lower === 'empresa' || lower === 'company' || lower === 'organizacion' ||
      lower === 'organización' || lower === 'compañia' || lower === 'compania' ||
      lower === 'institucion' || lower === 'institución'
    ) {
      return { original: col, mapped: 'company' };
    }

    // RUT
    if (lower === 'rut') {
      return { original: col, mapped: 'rut' };
    }

    // DV
    if (lower === 'dv') {
      return { original: col, mapped: null }; // Se une con RUT
    }

    // Status
    if (lower === 'estado' || lower === 'status' || lower === 'situacion' || lower === 'situación') {
      return { original: col, mapped: 'status' };
    }

    // Notes
    if (
      lower === 'notas' || lower === 'notes' || lower === 'comentarios' ||
      lower === 'comentario' || lower === 'observaciones' || lower === 'observacion' ||
      lower === 'direccion' || lower === 'dirección' || lower === 'cargo' ||
      lower === 'ciudad' || lower === 'region' || lower === 'región' ||
      lower === 'pais' || lower === 'país' || lower === 'run'
    ) {
      return { original: col, mapped: 'notes' };
    }

    // Unknown → notes
    return { original: col, mapped: 'notes' };
  });
}

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: DetectedColumn[]
): ParsedRow[] {
  const mapLookup = new Map<string, keyof ParsedRow | null>();
  for (const m of mapping) {
    mapLookup.set(m.original, m.mapped);
  }

  // Detect name component columns
  const nameParts: string[] = [];
  const apellidoCols: string[] = [];
  for (const col of mapping) {
    const lower = col.original.toLowerCase().trim();
    if (lower === 'nombre' || lower === 'name' || lower === 'nombres') {
      nameParts.push(col.original);
    }
    if (
      lower === 'a-paterno' || lower === 'apellido_paterno' || lower === 'apellidopaterno' ||
      lower === 'paterno' || lower === 'a-materno' || lower === 'apellido_materno' ||
      lower === 'apellidomaterno' || lower === 'materno' ||
      lower.includes('apellido') || lower.includes('a-paterno') || lower.includes('a-materno')
    ) {
      apellidoCols.push(col.original);
    }
  }

  // Detect RUT and DV columns
  const rutCol = mapping.find((m) => m.original.toLowerCase().trim() === 'rut');
  const dvCol = mapping.find((m) => m.original.toLowerCase().trim() === 'dv');

  return rows.map((row) => {
    const result: ParsedRow = {
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      rut: '',
      status: '',
    };

    // RUT normalization
    if (rutCol) {
      const rutVal = (row[rutCol.original] || '').toString().trim();
      const dvVal = dvCol ? (row[dvCol.original] || '').toString().trim() : undefined;
      if (rutVal) {
        result.rut = normalizeRut(rutVal, dvVal) || rutVal;
      }
    }

    // Build full name
    const nameValues: string[] = [];
    for (const col of nameParts) {
      const val = (row[col] || '').toString().trim();
      if (val) nameValues.push(val);
    }
    for (const col of apellidoCols) {
      const val = (row[col] || '').toString().trim();
      if (val) nameValues.push(val);
    }
    result.name = nameValues.join(' ');

    // Fallback name detection
    if (!result.name) {
      for (const [col, mapped] of mapLookup) {
        if (mapped === 'name') {
          const val = (row[col] || '').toString().trim();
          if (val) {
            result.name = val;
            break;
          }
        }
      }
    }

    // Extra notes from remaining columns
    const extraNotes: string[] = [];
    for (const [col, mapped] of mapLookup) {
      if (nameParts.includes(col) || apellidoCols.includes(col)) continue;
      if (rutCol && col === rutCol.original) continue;
      if (dvCol && col === dvCol.original) continue;

      const val = (row[col] || '').toString().trim();
      if (!val) continue;

      if (mapped === 'phone') {
        if (!result.phone) result.phone = normalizePhone(val);
      } else if (mapped === 'email') {
        if (!result.email) result.email = val;
      } else if (mapped === 'company') {
        if (!result.company) result.company = val;
      } else if (mapped === 'status') {
        if (!result.status) result.status = val;
      } else if (mapped === 'notes') {
        extraNotes.push(`${col}: ${val}`);
      }
    }

    result.notes = extraNotes.join(' | ');

    return result;
  });
}

// Duplicate detection helpers
export interface DuplicateInfo {
  rowIndex: number;
  reason: string;   // "RUT: 12345678-9", "Teléfono: 953843057", etc.
  existingLeadId?: number;
}

export function findDuplicatesInBatch(
  rows: ParsedRow[],
  existingRuts: Set<string>,
  existingPhones: Set<string>
): Map<number, DuplicateInfo[]> {
  const duplicates = new Map<number, DuplicateInfo[]>();
  const batchRuts = new Map<string, number>();   // rut → first row index
  const batchPhones = new Map<string, number>(); // phone → first row index

  // entries() en vez de indice suelto: la fila llega ya tipada, sin tener que
  // afirmar que existe en cada uno de los diez accesos de este bloque.
  for (const [i, row] of rows.entries()) {
    const rowDupes: DuplicateInfo[] = [];

    // Check RUT
    if (row.rut) {
      if (existingRuts.has(row.rut)) {
        rowDupes.push({ rowIndex: i, reason: `RUT: ${row.rut} (ya existe)` });
      } else if (batchRuts.has(row.rut)) {
        rowDupes.push({ rowIndex: i, reason: `RUT: ${row.rut} (duplicado en archivo, fila ${batchRuts.get(row.rut)! + 1})` });
      } else {
        batchRuts.set(row.rut, i);
      }
    }

    // Check Phone
    if (row.phone) {
      const cleanPhone = row.phone.replace(/[^+\d]/g, '');
      if (existingPhones.has(cleanPhone)) {
        rowDupes.push({ rowIndex: i, reason: `Teléfono: ${row.phone} (ya existe)` });
      } else if (batchPhones.has(cleanPhone)) {
        rowDupes.push({ rowIndex: i, reason: `Teléfono: ${row.phone} (duplicado en archivo, fila ${batchPhones.get(cleanPhone)! + 1})` });
      } else {
        batchPhones.set(cleanPhone, i);
      }
    }

    if (rowDupes.length > 0) {
      duplicates.set(i, rowDupes);
    }
  }

  return duplicates;
}
