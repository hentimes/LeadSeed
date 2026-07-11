import { useEffect, useState, useRef, useCallback } from 'react';
import VariableDropdown from './VariableDropdown';
import { insertTextAtCursor } from '../utils/textHelper';
import { Icon } from '../utils/icons';

interface Props {
  template?: {
    id?: number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
    templateListIds?: number[];
  } | null;
  type: 'whatsapp' | 'email' | 'call';
  categories?: { id: number; name: string; color: string }[];
  onSave: (data: {
    id?: number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
    templateListIds?: number[];
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

export default function TemplateEditor({ template, type, categories = [], onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState('');
  const [contenido, setContenido] = useState('');
  const [asunto, setAsunto] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
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
    } else {
      setNombre('');
      setContenido('');
      setAsunto('');
      setIsHtml(false);
      setSelectedCategories(new Set());
    }
  }, [template]);

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
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de plantilla *</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Mensaje de bienvenida"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {type === 'email' && (
        <>
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-700">Asunto *</label>
              <VariableDropdown onSelect={(val) => insertTextAtCursor(asuntoRef, asunto, val, setAsunto)} />
            </div>
            <div className="flex gap-2">
              <input
                ref={asuntoRef}
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Hola {nombre}, sobre tu plan de salud..."
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                📄 Importar HTML
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
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">
            Contenido *
          </label>
          <div className="flex gap-1">
            <VariableDropdown onSelect={(val) => insertTextAtCursor(contenidoRef, contenido, val, setContenido)} />
            {type === 'email' && isHtml && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  showPreview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                👁 Preview
              </button>
            )}
          </div>
        </div>

        <div className={showPreview ? 'grid grid-cols-2 gap-2' : ''}>
          {type === 'email' && isHtml ? (
            <textarea
              ref={contenidoRef}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={showPreview ? 12 : 8}
              placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hola {nombre}</h1>\n  <p>Te escribo para...</p>\n</body>\n</html>'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  ? 'Hola {nombre} 😊, te escribo de...'
                  : 'Hola {nombre},\n\nTe escribo para...'
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          )}

          {/* Preview panel */}
          {showPreview && isHtml && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-2 py-1 border-b text-xs text-gray-500 font-medium">
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

          {/* WhatsApp preview */}
          {type === 'whatsapp' && contenido && (
            <div className="bg-white border rounded-lg overflow-hidden flex flex-col h-full shadow-sm sticky top-4">
              <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                <span className="text-green-600"><Icon.Messages /></span> <span className="text-sm font-semibold text-gray-700">Vista previa WhatsApp</span>
              </div>
              <div className="p-4 bg-[#efeae2] flex-1 overflow-y-auto" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.9 }}>
                  {replaceVars(contenido)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Categorías</label>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => {
            const on = selectedCategories.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const n = new Set(selectedCategories);
                  n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                  setSelectedCategories(n);
                }}
                className={`px-2 py-1 rounded-full text-xs border ${on ? 'text-white border-transparent' : 'text-gray-600 border-gray-300'}`}
                style={on ? { backgroundColor: c.color } : {}}
              >
                {c.name}
              </button>
            );
          })}
          {categories.length === 0 && <span className="text-xs text-gray-400">No hay categorías disponibles. Créalas afuera.</span>}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          {template?.id ? 'Actualizar' : 'Crear Plantilla'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
