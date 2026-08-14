import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, WhatsAppTemplate, WhatsAppTemplateList, LeadList, SendLog } from '../../types';
import { replaceVariables, openWhatsAppForLeads } from '../../utils/waHelper';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, logWhatsAppSend } from '../../services/sendService';
import { Field, Select, Textarea } from '../../design';
import { SendStep } from './SendStep';
import { TemplatePicker } from './TemplatePicker';
import { RecipientPicker, RecipientCount, SendAction } from './RecipientPicker';
import { SendConfirmModal, RecipientSummary } from './SendConfirmModal';
import { SendHistoryDisclosure } from './SendHistoryDisclosure';

interface Props {
  leads: Lead[];
  templates: WhatsAppTemplate[];
  templateLists: WhatsAppTemplateList[];
  leadLists: LeadList[];
}

/**
 * Lienzo del chat de WhatsApp. Es color de marca ajena, como el #25D366:
 * una de las excepciones que documenta el README del sistema de diseno.
 *
 * La burbuja que va encima tampoco usa tokens y es a proposito: el lienzo
 * es claro y fijo en los dos temas, asi que un `text-ink` que se vuelve
 * casi blanco en modo oscuro dejaria el mensaje ilegible. La vista previa
 * imita WhatsApp, no la app.
 */
const WHATSAPP_CANVAS = '#efeae2';

export default function WhatsAppSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Edición dinámica al vuelo
  const [customBody, setCustomBody] = useState('');

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());

  const [leadSearch, setLeadSearch] = useState('');
  const [sentLog, setSentLog] = useState<SendLog[]>([]);

  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomBody(selectedTemplate.contenido || '');
    } else {
      setSentLog([]);
      setCustomBody('');
    }
  }, [selectedTemplate]);

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead
  useEffect(() => {
    const primero = recipients[0];
    if (primero && !previewLead) {
      setPreviewLead(primero);
    }
  }, [recipients, previewLead]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleList = (id: number) => {
    setSelectedListIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const clearRecipients = () => {
    setSelectedLeadIds(new Set());
    setSelectedListIds(new Set());
  };

  const preConfirmSend = () => {
    if (!selectedTemplate || recipients.length === 0) return;
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    if (!selectedTemplate || recipients.length === 0) return;
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    if (!userId) return;

    setSentLog(await logWhatsAppSend(userId, selectedTemplate.id!, recipients));

    openWhatsAppForLeads(recipients, customBody);
  };

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      <SendStep step={1} title="Plantilla">
        <TemplatePicker
          templates={templates}
          templateLists={templateLists}
          categoryId={catId}
          onCategoryChange={setCatId}
          selectedId={String(selectedTemplate?.id ?? '')}
          onSelect={setSelectedTemplate}
        />
      </SendStep>

      <SendStep step={2} title="Mensaje" disabled={!selectedTemplate}>
        {selectedTemplate ? (
          <div className="flex flex-col gap-2.5">
            <Field
              label="Contenido (edición temporal)"
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
                rows={5}
              />
            </Field>

            <Field
              label="Vista previa"
              action={
                <Select
                  value={previewLead?.id ?? ''}
                  onChange={(e) => setPreviewLead(leads.find((l) => l.id === e.target.value) || null)}
                  fullWidth={false}
                  compact
                  className="max-w-[140px]"
                >
                  <option value="">Elegir lead...</option>
                  {recipients.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              }
            >
              <div
                className="max-h-32 overflow-y-auto rounded-md border border-line p-2"
                style={{ backgroundColor: WHATSAPP_CANVAS }}
              >
                {previewLead ? (
                  <div className="inline-block max-w-[90%] whitespace-pre-wrap rounded-lg bg-surface p-2 text-micro text-slate-900 shadow-sm">
                    {replaceVariables(customBody, previewLead)}
                  </div>
                ) : (
                  <p className="py-3 text-center text-micro text-ink-secondary">
                    Elegí un destinatario para ver el mensaje.
                  </p>
                )}
              </div>
            </Field>
          </div>
        ) : (
          <p className="text-micro text-ink-muted">Elegí una plantilla para editar el mensaje.</p>
        )}
      </SendStep>

      <SendStep step={3} title="Destinatarios" actions={<RecipientCount count={recipients.length} />}>
        <RecipientPicker
          leads={leads}
          leadLists={leadLists}
          selectedLeadIds={selectedLeadIds}
          selectedListIds={selectedListIds}
          onToggleLead={toggleLead}
          onToggleList={toggleList}
          onClear={clearRecipients}
          search={leadSearch}
          onSearchChange={setLeadSearch}
          sentLeadIds={sentLeadIds}
          secondaryField="phone"
        />
      </SendStep>

      <SendStep step={4} title="Enviar">
        <div className="flex flex-col gap-2.5">
          <SendAction
            label={`Abrir WhatsApp para ${recipients.length} lead${recipients.length === 1 ? '' : 's'}`}
            disabled={!selectedTemplate || recipients.length === 0}
            onClick={preConfirmSend}
          />
          <SendHistoryDisclosure log={sentLog} templateName={selectedTemplate?.nombre} />
        </div>
      </SendStep>

      {showConfirmModal && selectedTemplate && (
        <SendConfirmModal
          title="Confirmar envío"
          subtitle="Se abrirá WhatsApp Web para completar el envío."
          confirmLabel="Abrir WhatsApp"
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={executeSend}
          rows={[
            { label: 'Plantilla', value: selectedTemplate.nombre },
            {
              label: `Destinatarios (${recipients.length})`,
              value: <RecipientSummary names={recipients.map((r) => r.name)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
