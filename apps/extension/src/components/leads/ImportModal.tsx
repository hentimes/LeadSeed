import { useState, useMemo, useRef } from 'react';
import {
  parseJSONFile,
  parseExcelFile,
  detectMapping,
  normalizeRows,
  findDuplicatesInBatch,
  type ParsedRow,
  type DuplicateInfo,
} from '../../utils/importParser';
import { getErrorMessage } from '../../utils/errorMessage';
import { Button, Modal } from '../../design';

interface Props {
  existingRuts: Set<string>;
  existingPhones: Set<string>;
  onImport: (rows: ParsedRow[]) => void;
  onClose: () => void;
}

export default function ImportModal({ existingRuts, existingPhones, onImport, onClose }: Props) {
  const [, setRawRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'drop' | 'preview'>('drop');
  const [showColInfo, setShowColInfo] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const duplicateMap = useRef<Map<number, DuplicateInfo[]>>(new Map());

  const detectedMapping = useMemo(() => detectMapping(columns), [columns]);

  const duplicateCount = duplicateMap.current.size;
  const selectedCount = selected.size;
  const cleanCount = preview.length - duplicateCount;

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    setFileName(file.name);

    try {
      let result: { rows: Record<string, string>[]; columns: string[] };
      if (file.name.endsWith('.json')) {
        result = await parseJSONFile(file);
      } else {
        result = await parseExcelFile(file);
      }

      if (result.rows.length === 0) {
        setError('No se encontraron registros en el archivo');
        setLoading(false);
        return;
      }

      setRawRows(result.rows);
      setColumns(result.columns);

      const normalized = normalizeRows(result.rows, detectMapping(result.columns));
      const dupes = findDuplicatesInBatch(normalized, existingRuts, existingPhones);
      duplicateMap.current = dupes;

      // Pre-select all non-duplicate rows
      const initialSelected = new Set<number>();
      for (let i = 0; i < normalized.length; i++) {
        if (!dupes.has(i)) {
          initialSelected.add(i);
        }
      }

      setPreview(normalized);
      setSelected(initialSelected);
      setStep('preview');
    } catch (e) {
      setError(getErrorMessage(e, 'Error al procesar archivo'));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(preview.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const selectClean = () => {
    const clean = new Set<number>();
    for (let i = 0; i < preview.length; i++) {
      if (!duplicateMap.current.has(i)) {
        clean.add(i);
      }
    }
    setSelected(clean);
  };

  const handleImport = () => {
    const toImport = preview.filter((_, i) => selected.has(i));
    if (toImport.length > 0) {
      onImport(toImport);
      onClose();
    }
  };

  const handleResetFile = () => {
    setRawRows([]);
    setColumns([]);
    setPreview([]);
    setFileName('');
    setSelected(new Set());
    duplicateMap.current = new Map();
    setStep('drop');
  };

  return (
    <Modal onClose={onClose} maxWidth="1024px" label="Importar leads">
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-section-title font-semibold text-ink tracking-tight">Importar Leads</h2>
            <button
              onClick={() => setShowColInfo(!showColInfo)}
              className="text-ink-muted hover:text-blue-600 text-lg leading-none"
              title="Formato de columnas aceptado"
            >?</button>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-secondary text-xl">
            x
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {showColInfo && (
            <div className="mb-4 rounded-lg bg-state-info-soft p-3 text-micro text-ink">
              <p className="font-semibold text-blue-800 mb-2">Formato de columnas aceptado:</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  ['Nombre', 'nombre, name, nombres'],
                  ['Apellidos', 'apellido, paterno, materno (se unen al nombre)'],
                  ['Teléfono', 'telefono, teléfono, phone, celular, whatsapp'],
                  ['Email', 'email, correo, e-mail, mail'],
                  ['Empresa', 'empresa, company, organización'],
                  ['RUT', 'rut (con columna dv opcional)'],
                  ['Estado', 'estado, status'],
                  ['Notas', 'notas, notes, comentarios (u otras columnas)'],
                ].map(([label, cols]) => (
                  <div key={label}><span className="font-medium">{label}:</span> <span className="text-ink-secondary">{cols}</span></div>
                ))}
              </div>
            </div>
          )}
          {step === 'drop' && (
            <div
              data-zona-archivos
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-line-strong rounded-lg p-12 text-center hover:border-blue-400 transition-colors"
            >
              <p className="text-ink-muted mb-4">
                Arrastra un archivo JSON o Excel aquí
              </p>
              <p className="text-ink-muted text-sm mb-4">o</p>
              <label className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-blue-700">
                Seleccionar archivo
                <input
                  type="file"
                  accept=".json,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
              {loading && <p className="mt-4 text-ink-muted">Procesando...</p>}
              {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {step === 'preview' && (
            <div>
              {/* Header with stats and actions */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-ink-secondary">
                    <strong>{fileName}</strong> — {preview.length} registros
                  </p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-green-600">
                      {cleanCount} sin duplicados
                    </span>
                    {duplicateCount > 0 && (
                      <span className="text-xs text-red-600 font-medium">
                        {duplicateCount} duplicados detectados
                      </span>
                    )}
                    <span className="text-xs text-blue-600">
                      {selectedCount} seleccionados
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={selectAll}
                    className="text-xs bg-surface-hover hover:bg-surface-sunken px-2 py-1 rounded"
                  >
                    Seleccionar todo
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs bg-surface-hover hover:bg-surface-sunken px-2 py-1 rounded"
                  >
                    Deseleccionar todo
                  </button>
                  <button
                    onClick={selectClean}
                    className="rounded bg-state-success-soft px-2 py-1 text-micro text-ink transition-colors hover:bg-state-success hover:text-white"
                  >
                    Solo sin duplicados
                  </button>
                  <button
                    onClick={handleResetFile}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Column mapping info */}
              <details className="mb-4">
                <summary className="text-xs text-ink-muted cursor-pointer hover:text-ink-secondary">
                  Ver mapeo de columnas ({columns.length} columnas detectadas)
                </summary>
                <div className="mt-2 p-2 bg-surface-muted rounded text-xs grid grid-cols-2 gap-1">
                  {detectedMapping.map((col) => (
                    <div key={col.original} className="flex items-center gap-1">
                      <span className="text-ink-muted truncate max-w-[140px]" title={col.original}>
                        "{col.original}"
                      </span>
                      <span className="text-ink-muted">→</span>
                      <span className={col.mapped ? 'text-green-600' : 'text-yellow-600'}>
                        {col.mapped || 'nombre'}
                      </span>
                    </div>
                  ))}
                </div>
              </details>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted sticky top-0">
                    <tr>
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected.size === preview.length}
                          onChange={() => selected.size === preview.length ? deselectAll() : selectAll()}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left px-2 py-2 font-medium w-8">#</th>
                      <th className="text-left px-2 py-2 font-medium">Nombre</th>
                      <th className="text-left px-2 py-2 font-medium">Teléfono</th>
                      <th className="text-left px-2 py-2 font-medium">RUT</th>
                      <th className="text-left px-2 py-2 font-medium">Email</th>
                      <th className="text-left px-2 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => {
                      const dupes = duplicateMap.current.get(i);
                      const isDup = !!dupes;
                      const isSelected = selected.has(i);

                      return (
                        <tr
                          key={i}
                          className={`border-t ${
                            isDup ? 'bg-state-danger-soft' : isSelected ? 'bg-primary-soft' : 'hover:bg-surface-muted'
                          }`}
                        >
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(i)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-ink-muted text-xs">{i + 1}</td>
                          <td className="px-2 py-1.5 font-medium">{row.name}</td>
                          <td className={`px-2 py-1.5 ${isDup && dupes!.some((d) => d.reason.includes('Teléfono')) ? 'text-red-600 font-medium' : ''}`}>
                            {row.phone}
                          </td>
                          <td className={`px-2 py-1.5 ${isDup && dupes!.some((d) => d.reason.includes('RUT')) ? 'text-red-600 font-medium' : ''}`}>
                            {row.rut}
                          </td>
                          <td className="px-2 py-1.5 text-blue-600 text-xs">{row.email}</td>
                          <td className="px-2 py-1.5">
                            {isDup ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="rounded bg-state-danger-soft px-1.5 py-0.5 text-micro font-medium text-state-danger-ink">
                                  DUPLICADO
                                </span>
                                {dupes!.map((d, j) => (
                                  <span key={j} className="text-xs text-red-600" title={d.reason}>
                                    {d.reason}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-green-600">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom actions */}
              <div className="flex gap-2 justify-end mt-4 items-center">
                <p className="text-sm text-ink-muted mr-auto">
                  {selectedCount} de {preview.length} leads seleccionados
                </p>
                <Button onClick={handleResetFile}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                >
                  Importar {selectedCount} leads
                </Button>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}
