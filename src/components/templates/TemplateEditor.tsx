import { useEffect, useState, useRef, useCallback } from 'react';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { Icon } from '../../utils/icons';
import { Button, Modal } from '../../design';
import type { EditableTemplate } from '../../types';

interface Props {
  template?: EditableTemplate | null;
  type: 'whatsapp' | 'email' | 'call';
  categories?: { id: number; name: string; color: string }[];
  /** Catalogo de motivos, para el desplegable de valor por defecto. */
  reasons?: { id: number; text: string }[];
  onSave: (data: {
    id?: number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
    templateListIds?: number[];
    defaultReasonId?: number | null;
  }) => void;
  onCancel: () => void;
}

// Sample data for preview
const SAMPLE_LEAD = {
  name: 'María González',
  phone: '+56912345678',
  email: 'maria@ejemplo.cl',
  company: 'Empresa Demo',
  rut: '12345678-9',
  notes: 'Cliente VIP',
};


/**
 * Textura del simulador de WhatsApp.
 *
 * Antes era `url("https://user-images.githubusercontent.com/...png")`: un
 * adjunto de un issue de GitHub de un tercero. Sin conexion no cargaba, y si
 * ese adjunto desaparece la vista previa se queda plana sin que nadie se entere.
 * Ahora es un SVG local sobre el mismo beige.
 */
const TEXTURA_WHATSAPP = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
    '<g fill="none" stroke="#D5CBBF" stroke-width="1.4" stroke-linecap="round" opacity="0.55">' +
    '<path d="M14 20h12M14 26h7"/><path d="M62 12h14M62 18h9"/>' +
    '<path d="M30 54h13M30 60h8"/><path d="M70 66h12M70 72h6"/>' +
    '<circle cx="24" cy="76" r="5"/><circle cx="80" cy="40" r="4"/>' +
    '<path d="M46 30l5 5-5 5-5-5z"/><path d="M8 46l4 4-4 4-4-4z"/>' +
    '</g></svg>',
)}")`;

export default function TemplateEditor({ template, type, categories = [], reasons = [], onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState('');
  const [contenido, setContenido] = useState('');
  const [asunto, setAsunto] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [defaultReasonId, setDefaultReasonId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const asuntoRef = useRef<HTMLInputElement>(null);
  const contenidoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setNombre(template.nombre);
      setContenido(template.contenido);
      setAsunto(template.asunto || '');
      setIsHtml(template.isHtml || false);
      setSelectedCategories(new Set(template.templateListIds || []));
      setDefaultReasonId(template.defaultReasonId ?? null);
    } else {
      setNombre('');
      setContenido('');
      setAsunto('');
      setIsHtml(false);
      setSelectedCategories(new Set());
      setDefaultReasonId(null);
    }
  }, [template]);

  // El asunto tambien cuenta: un correo puede llevar el motivo en el titulo.
  const usaMotivo = /\{motivo\}/i.test(contenido) || /\{motivo\}/i.test(asunto);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !contenido.trim()) return;
    if (type === 'email' && !asunto.trim()) return;
    onSave({
      id: template?.id || 0,
      nombre: nombre.trim(),
      contenido: contenido.trim(),
      asunto: type === 'email' ? asunto.trim() : undefined,
      isHtml: type === 'email' ? isHtml : undefined,
      templateListIds: Array.from(selectedCategories),
      defaultReasonId,
    });
  };

  const replaceVars = useCallback((text: string) => {
    return text
      .replace(/\{nombre\}/gi, SAMPLE_LEAD.name)
      .replace(/\{telefono\}/gi, SAMPLE_LEAD.phone)
      .replace(/\{email\}/gi, SAMPLE_LEAD.email)
      .replace(/\{empresa\}/gi, SAMPLE_LEAD.company)
      .replace(/\{rut\}/gi, SAMPLE_LEAD.rut)
      .replace(/\{notas\}/gi, SAMPLE_LEAD.notes);
  }, []);

  const handleImportHtml = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const html = ev.target?.result as string;
      if (html) {
        setContenido(html);
        setIsHtml(true);
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-loaded
    e.target.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-ink-secondary mb-1">Nombre de plantilla *</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Mensaje de bienvenida"
          className="w-full border border-line-strong rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {type === 'email' && (
        <>
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-ink-secondary">Asunto *</label>
              <VariableDropdown onSelect={(val: string) => insertTextAtCursor(asuntoRef, asunto, val, setAsunto)} />
            </div>
            <div className="flex gap-2">
              <input
                ref={asuntoRef}
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Hola {nombre}, sobre tu plan de salud..."
                className="flex-1 border border-line-strong rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isHtml}
                onChange={(e) => setIsHtml(e.target.checked)}
                className="rounded"
              />
              HTML enriquecido
            </label>
            {isHtml && (
              <button
                type="button"
                onClick={handleImportHtml}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                 Importar HTML
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileLoad}
              className="hidden"
            />
          </div>
        </>
      )}

      <div>
        <div className="flex-1 flex flex-col mt-4">
          <label className="block text-sm font-medium text-ink-secondary mb-1">
            Contenido *
          </label>
          <div className="flex gap-1">
            <VariableDropdown onSelect={(val: string) => insertTextAtCursor(contenidoRef, contenido, val, setContenido)} />
            {(type === 'whatsapp' || (type === 'email' && isHtml)) && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  showPreview ? 'bg-blue-100 text-blue-700' : 'bg-surface-hover hover:bg-surface-sunken'
                }`}
              >
                 Vista Previa
              </button>
            )}
          </div>
        </div>

        <div className={(showPreview && type === 'email' && isHtml) ? 'grid grid-cols-2 gap-2' : ''}>
          {type === 'email' && isHtml ? (
            <textarea
              ref={contenidoRef}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={showPreview ? 12 : 8}
              placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hola {nombre}</h1>\n  <p>Te escribo para...</p>\n</body>\n</html>'}
              className="w-full border border-line-strong rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          ) : (
            <textarea
              ref={contenidoRef}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              placeholder={
                type === 'whatsapp'
                  ? 'Hola {nombre} , te escribo de...'
                  : 'Hola {nombre},\n\nTe escribo para...'
              }
              className="w-full border border-line-strong rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          )}

          {/* Preview panel */}
          {showPreview && isHtml && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-surface-muted px-2 py-1 border-b text-xs text-ink-muted font-medium">
                Vista previa
              </div>
              <div className="p-3 overflow-y-auto max-h-[300px] text-sm">
                <iframe
                  srcDoc={replaceVars(contenido)}
                  title="Preview"
                  className="w-full min-h-[280px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* WhatsApp preview Modal */}
          {showPreview && type === 'whatsapp' && contenido && (
            <Modal onClose={() => setShowPreview(false)} maxWidth="320px" label="Vista previa del mensaje">
                <div className="bg-surface-muted px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#25D366]"><Icon.Messages /></span> 
                    <span className="text-sm font-semibold text-ink">Vista previa</span>
                  </div>
                  <button type="button" onClick={() => setShowPreview(false)} className="text-ink-muted hover:text-ink-secondary transition-colors p-1"><Icon.Close /></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto relative min-h-[300px]" style={{ backgroundColor: '#E5DDD5', backgroundImage: TEXTURA_WHATSAPP, backgroundSize: '96px' }}>
                  <div className="bg-surface text-[#111B21] text-[12.5px] leading-relaxed p-2 px-3 rounded-lg rounded-tr-none shadow-sm max-w-[90%] float-right relative whitespace-pre-wrap">
                    {replaceVars(contenido)}
                  </div>
                  <div className="clear-both"></div>
                </div>
            </Modal>
          )}
        </div>
      </div>

      {/* El bloque aparece en cuanto hay motivos en el catalogo, aunque la
          plantilla todavia no use la variable.

          Antes solo salia si el texto ya tenia `{motivo}`, y eso dejaba al
          usuario sin camino: creaba los motivos, abria la plantilla y no veia
          nada que los relacionara. El control que falta no puede esconderse
          justo cuando hace falta descubrirlo. */}
      {reasons.length > 0 && (
        <div className="pt-2">
          <label htmlFor="motivo-defecto" className="block text-sm font-medium text-ink-secondary mb-1">
            Motivo del mensaje
          </label>

          {usaMotivo ? (
            <>
              <select
                id="motivo-defecto"
                value={defaultReasonId ?? ''}
                onChange={(e) => setDefaultReasonId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-line rounded-[6px] px-3 py-1.5 text-[13px] text-ink bg-surface outline-none focus:border-primary"
              >
                <option value="">Sin motivo por defecto</option>
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>{reason.text}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-muted">
                Viene puesto al enviar y se puede cambiar en cada envío.
              </p>
            </>
          ) : (
            <div className="rounded-[6px] border border-dashed border-line-strong p-2.5">
              <p className="text-xs text-ink-secondary">
                Tienes {reasons.length} {reasons.length === 1 ? 'motivo creado' : 'motivos creados'}.
                Para usarlos, pon <code className="font-mono text-ink">{'{motivo}'}</code> donde quieras
                que aparezcan.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => insertTextAtCursor(contenidoRef, contenido, '{motivo}', setContenido)}
              >
                Insertar {'{motivo}'} en el mensaje
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <label className="block text-sm font-medium text-ink-secondary mb-1">Categorías</label>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => {
            const on = selectedCategories.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const n = new Set(selectedCategories);
                  if (n.has(c.id)) n.delete(c.id);
                  else n.add(c.id);
                  setSelectedCategories(n);
                }}
                className={`px-2 py-1 rounded-full text-xs border ${on ? 'text-white border-transparent' : 'text-ink-secondary border-line-strong'}`}
                style={on ? { backgroundColor: c.color } : {}}
              >
                {c.name}
              </button>
            );
          })}
          {categories.length === 0 && <span className="text-xs text-ink-muted">No hay categorías disponibles. Créalas afuera.</span>}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary">
          {template?.id ? 'Actualizar' : 'Crear Plantilla'}
        </Button>
        <Button type="button" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
