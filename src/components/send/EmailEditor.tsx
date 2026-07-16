import { useRef } from 'react';
import type { EmailTemplate } from '../../types';
import type { EmailAttachment } from '../../utils/emailSender';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { Icon } from '../../utils/icons';

interface Props {
  selectedTemplate: EmailTemplate;
  customSubject: string;
  setCustomSubject: (val: string) => void;
  customBody: string;
  setCustomBody: (val: string) => void;
  attachments: EmailAttachment[];
  setAttachments: (fn: (prev: EmailAttachment[]) => EmailAttachment[]) => void;
  setShowPreviewModal: (val: boolean) => void;
}

export default function EmailEditor({
  selectedTemplate, customSubject, setCustomSubject, customBody, setCustomBody, attachments, setAttachments, setShowPreviewModal
}: Props) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64String = (ev.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, { filename: file.name, content: base64String }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-4 border-b border-gray-100 pb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">2. Edición al Vuelo</h3>
        {selectedTemplate.isHtml && (
          <button onClick={() => setShowPreviewModal(true)} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-blue-200 text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 flex items-center gap-1 shadow-sm">
            <Icon.View /> Ver Vista Previa
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-end mb-0.5">
            <label className="block text-[11px] text-blue-600">Asunto (Puedes editarlo para este envío)</label>
            <VariableDropdown onSelect={(val: string) => insertTextAtCursor(subjectRef, customSubject, val, setCustomSubject)} />
          </div>
          <input 
            ref={subjectRef}
            type="text" 
            value={customSubject} 
            onChange={(e) => setCustomSubject(e.target.value)}
            className="w-full border border-blue-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <div className="flex justify-between items-end mb-0.5">
            <label className="block text-[11px] text-blue-600">Contenido (Edición temporal)</label>
            <VariableDropdown onSelect={(val: string) => insertTextAtCursor(bodyRef, customBody, val, setCustomBody)} />
          </div>
          <textarea 
            ref={bodyRef}
            value={customBody} 
            onChange={(e) => setCustomBody(e.target.value)}
            rows={4}
            className={`w-full border border-blue-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 ${selectedTemplate.isHtml ? 'font-mono text-xs' : ''}`} 
          />
        </div>
        
        <div className="mt-2 border-t border-blue-100 pt-2">
          <label className="block text-[11px] text-blue-600 mb-0.5">Archivos Adjuntos (Opcional)</label>
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange} 
            className="text-xs text-blue-700 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer mb-2"
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att, i) => (
                <span key={i} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 shadow-sm">
                  <Icon.Paperclip /> <span className="max-w-[120px] truncate" title={att.filename}>{att.filename}</span>
                  <button onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center font-bold">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
