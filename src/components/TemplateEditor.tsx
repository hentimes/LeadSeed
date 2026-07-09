import { useEffect, useState, useRef, useCallback } from 'react';
import EmojiPicker from './EmojiPicker';

interface Props {
  template?: {
    id?: number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
  } | null;
  type: 'whatsapp' | 'email';
  onSave: (data: {
    id?: number;
    nombre: string;
    contenido: string;
    asunto?: string;
    isHtml?: boolean;
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

export default function TemplateEditor({ template, type, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState('');
  const [contenido, setContenido] = useState('');
  const [asunto, setAsunto] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (template) {
      setNombre(template.nombre);
      setContenido(template.contenido);
      setAsunto(template.asunto || '');
      setIsHtml(template.isHtml || false);
    } else {
      setNombre('');
      setContenido('');
      setAsunto('');
      setIsHtml(false);
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
    });
  };

  const insertVariable = (v: string) => {
    setContenido((prev) => prev + ` {${v}}`);
  };

  const insertEmoji = (emoji: string) => {
    setContenido((prev) => prev + emoji);
    setShowEmoji(false);
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

  const variables = ['nombre', 'telefono', 'email', 'empresa', 'notas', 'rut'];

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Asunto del correo"
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
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
            >
              😊 Emoji
            </button>
          </div>
        </div>

        {showEmoji && (
          <div className="mb-2">
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
          </div>
        )}

        <div className={showPreview ? 'grid grid-cols-2 gap-2' : ''}>
          {type === 'email' && isHtml ? (
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={showPreview ? 12 : 8}
              placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hola {nombre}</h1>\n  <p>Te escribo para...</p>\n</body>\n</html>'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          ) : (
            <textarea
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
            <div className="border rounded-lg overflow-hidden mt-2">
              <div className="bg-green-50 px-3 py-2 border-b text-xs text-green-700 font-medium flex items-center gap-1">
                💬 Vista previa WhatsApp
              </div>
              <div className="p-3 bg-[#efeae2] max-h-[200px] overflow-y-auto">
                <div className="bg-white rounded-lg p-3 shadow-sm inline-block max-w-[85%] text-sm whitespace-pre-wrap">
                  {replaceVars(contenido)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Insertar variable:
        </label>
        <p className="text-[10px] text-gray-400 mb-1.5">
          Se reemplazan con los datos reales del lead al enviar. Ej: {'{nombre}'} → "María González"
        </p>
        <div className="flex gap-1 flex-wrap">
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              title={`{${v}} → se reemplaza con el ${v} del lead`}
              className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs hover:bg-gray-200"
            >
              {`{${v}}`}
            </button>
          ))}
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
