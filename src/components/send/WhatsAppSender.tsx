import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, WhatsAppTemplate, WhatsAppTemplateList, LeadList, SendLog } from '../../types';
import { buildLeadMessages, openWhatsAppMessages } from '../../utils/waHelper';
import { useMessageReasons } from '../../hooks/useMessageReasons';
import { getSettings } from '../../services/appSettingsService';
import { ReasonPicker } from './ReasonPicker';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, logWhatsAppSend } from '../../services/sendService';
import { Field, Select, Textarea } from '../../design';
import { SendStep } from './SendStep';
import { puedeRecibirPor } from '../../utils/leadContacto';
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

/**
 * Lead ficticio para la vista previa cuando todavia no se eligio destinatario.
 * Los mismos datos que usa el editor de plantillas, para que la frase se lea
 * igual en los dos sitios.
 */
const LEAD_DE_EJEMPLO = {
  name: 'María González',
  phone: '+56912345678',
  email: 'maria@ejemplo.cl',
  company: 'Empresa Demo',
  rut: '12345678-9',
  notes: 'Cliente VIP',
} as Lead;

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

  // Motivo del mensaje: se elige una vez por envio, no por destinatario.
  const { motivos: reasons } = useMessageReasons();
  const [motivoId, setMotivoId] = useState<number | null>(null);

  /**
   * Donde se va a abrir WhatsApp.
   *
   * El modal de confirmacion decia siempre "Se abrira WhatsApp Web", incluso
   * con la preferencia puesta en la app de escritorio: afirmaba algo falso
   * justo en la pantalla donde el usuario decide si envia. El ajuste vive en
   * Ajustes, lejos de aqui, y por eso nadie lo noto.
   */
  const [clienteWhatsApp, setClienteWhatsApp] = useState<'web' | 'app'>('web');

  useEffect(() => {
    getSettings().then((s) => setClienteWhatsApp(s.whatsappClientPreference || 'web'));
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomBody(selectedTemplate.contenido || '');
      // El motivo por defecto de la plantilla viene puesto; se puede cambiar.
      setMotivoId(selectedTemplate.defaultReasonId ?? null);
    } else {
      setSentLog([]);
      setCustomBody('');
      setMotivoId(null);
    }
  }, [selectedTemplate]);

  const usaMotivo = /\{motivo\}/i.test(customBody);
  const motivoTexto = reasons.find((reason) => reason.id === motivoId)?.text;

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  /*
   * El filtro por canal se aplica tambien aqui, no solo en la lista.
   *
   * Marcar una lista anadia todos sus leads directamente al envio, sin pasar
   * por la lista de la pantalla: una lista de mil contactos metia a los que no
   * tenian el dato del canal, y el envio salia con destinatarios que no podian
   * recibirlo. Filtrar en el selector no bastaba porque ese camino lo esquiva.
   */
  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!) && puedeRecibirPor(l, 'whatsapp'));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead
  useEffect(() => {
    const primero = recipients[0];
    if (primero && !previewLead) {
      setPreviewLead(primero);
    }
  }, [recipients, previewLead]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id);
      else n.add(id); return n; });
  };
  const toggleList = (id: number) => {
    setSelectedListIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id);
      else n.add(id); return n; });
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

    // Se resuelve una sola vez: lo que se guarda en el historial y lo que se
    // abre en WhatsApp tienen que ser el mismo texto, no dos resoluciones.
    const mensajes = buildLeadMessages(recipients, customBody, motivoTexto);

    setSentLog(await logWhatsAppSend(userId, selectedTemplate.id!, mensajes, selectedTemplate.nombre));

    openWhatsAppMessages(mensajes);
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
            {usaMotivo && (
              <Field
                label="Motivo del mensaje"
                hint={
                  reasons.length === 0
                    ? 'No hay motivos todavia. Crealos en Plantillas, con "Gestionar motivos".'
                    : 'Sustituye a {motivo}. Es el mismo para todo este envio.'
                }
              >
                <ReasonPicker
                  motivos={reasons}
                  seleccionado={motivoId}
                  onSeleccionar={setMotivoId}
                />
              </Field>
            )}

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
                {/* Sin destinatario elegido se usa uno de ejemplo, en vez de no
                    mostrar nada. La vista previa es donde se lee el motivo ya
                    sustituido en la frase, asi que tiene que servir desde el
                    primer momento y no solo despues de elegir a quien escribir. */}
                <div className="inline-block max-w-[90%] whitespace-pre-wrap rounded-lg bg-surface p-2 text-micro text-slate-900 shadow-sm">
                  {buildLeadMessages([previewLead ?? LEAD_DE_EJEMPLO], customBody, motivoTexto)[0]?.message}
                </div>
                {!previewLead && (
                  <p className="mt-1.5 text-center text-micro text-ink-secondary">
                    Con datos de ejemplo. Elegí un destinatario para ver el suyo.
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
          canal="whatsapp"
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
          subtitle={
            clienteWhatsApp === 'app'
              ? 'Se abrirá la app de escritorio de WhatsApp para completar el envío.'
              : 'Se abrirá WhatsApp Web para completar el envío.'
          }
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
