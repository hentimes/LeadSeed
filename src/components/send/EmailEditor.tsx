import { useRef } from 'react';
import type { EmailAttachment, EmailTemplate } from '../../types';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { Icon } from '../../utils/icons';
import { Button, Field, Input, Textarea } from '../../design';

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

/**
 * Edicion al vuelo del correo: asunto, cuerpo y adjuntos.
 *
 * El bloque solo cambia el envio en curso; la plantilla guardada no se
 * toca. Eso antes se explicaba dentro de la etiqueta del campo, que
 * quedaba de dos renglones; ahora va como pista bajo el control.
 */
export default function EmailEditor({
  selectedTemplate,
  customSubject,
  setCustomSubject,
  customBody,
  setCustomBody,
  attachments,
  setAttachments,
  setShowPreviewModal,
}: Props) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64String = (ev.target?.result as string).split(',')[1];
        setAttachments((prev) => [...prev, { filename: file.name, content: base64String }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Field
        label="Asunto"
        action={
          <VariableDropdown
            onSelect={(val: string) => insertTextAtCursor(subjectRef, customSubject, val, setCustomSubject)}
          />
        }
      >
        <Input
          ref={subjectRef}
          type="text"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
        />
      </Field>

      <Field
        label="Contenido"
        hint="Los cambios aplican solo a este envío, la plantilla no se modifica."
        action={
          <VariableDropdown
            onSelect={(val: string) => insertTextAtCursor(bodyRef, customBody, val, setCustomBody)}
          />
        }
      >
        <Textarea
          ref={bodyRef}
          value={customBody}
          onChange={(e) => setCustomBody(e.target.value)}
          rows={selectedTemplate.isHtml ? 6 : 5}
          className={selectedTemplate.isHtml ? 'font-mono text-micro' : ''}
        />
      </Field>

      {selectedTemplate.isHtml && (
        <Button variant="secondary" size="sm" icon={<Icon.View />} onClick={() => setShowPreviewModal(true)}>
          Ver vista previa
        </Button>
      )}

      <Field label="Archivos adjuntos">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full cursor-pointer text-micro text-ink-secondary file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-soft file:px-2.5 file:py-1.5 file:text-micro file:font-medium file:text-primary hover:file:bg-primary-soft-strong"
        />
        {attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {attachments.map((att, i) => (
              <span
                key={`${att.filename}-${i}`}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-micro text-ink-secondary"
              >
                <Icon.Paperclip />
                <span className="max-w-[120px] truncate" title={att.filename}>
                  {att.filename}
                </span>
                <button
                  onClick={() => removeAttachment(i)}
                  aria-label={`Quitar ${att.filename}`}
                  className="text-ink-muted transition-colors hover:text-state-danger"
                >
                  <Icon.Close />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>
    </div>
  );
}
