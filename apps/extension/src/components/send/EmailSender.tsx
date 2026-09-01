import { useState, useMemo, useEffect, useRef } from 'react';
import type {
  EmailAttachment,
  EmailDeliveryChannelOption,
  EmailTemplate,
  EmailTemplateList,
  Lead,
  LeadList,
  SendLog,
} from '../../types';
import { replaceVariables } from '../../utils/waHelper';
import EmailEditor from './EmailEditor';
import EmailScheduler from './EmailScheduler';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, scheduleEmailSend, sendImmediateEmail } from '../../services/sendService';
import { applyReason } from '../../utils/waHelper';
import { useMessageReasons } from '../../hooks/useMessageReasons';
import { ReasonPicker } from './ReasonPicker';
import { getSettings } from '../../services/appSettingsService';
import { getMyCalendarConnectionStatus } from '../../services/agendaService';
import { listChannels } from '../../services/emailChannelsService';
import { Badge, Button, Field, Modal, Select } from '../../design';
import { SendStep, SendRequisito } from './SendStep';
import type { SendActionState } from './channels';
import { useSendAction } from './useSendAction';
import { puedeRecibirPor } from '../../utils/leadContacto';
import { TemplatePicker } from './TemplatePicker';
import { RecipientSheet } from './RecipientSheet';
import { useRecipientBrowsing } from './useRecipientBrowsing';
import { useSendSession } from './useSendSession';
import { RecipientSummaryRow } from './RecipientSummaryRow';
import { SendConfirmModal, RecipientSummary } from './SendConfirmModal';
import { SendHistoryDisclosure } from './SendHistoryDisclosure';
import { getPlatform } from '../../platform/registry';

interface Props {
  leads: Lead[];
  templates: EmailTemplate[];
  templateLists: EmailTemplateList[];
  leadLists: LeadList[];
  /** Le dice al pie fijo de `SendPage` como tiene que verse su boton. */
  onActionChange: (action: SendActionState) => void;
}

export default function EmailSender({ leads, templates, templateLists, leadLists, onActionChange }: Props) {
  const sesion = useSendSession('email');

  // Se arranca donde se dejo, igual que el compositor de WhatsApp.
  const [catId, setCatId] = useState<number | null>(sesion.ultima.categoriaId);
  /** Para llevar el foco al selector cuando el boton dice "Elegi una plantilla". */
  const plantillaRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    () => templates.find((t) => String(t.id) === sesion.ultima.plantillaId) ?? null,
  );

  // Edición dinámica
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  // Motivo del mensaje: uno por envio, aplicado al asunto y al cuerpo.
  const { motivos: reasons } = useMessageReasons();
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());

  // Busqueda, pagina y filtro de la hoja de destinatarios. Viven aca porque
  // la hoja se desmonta al cerrarse y enviar de a uno es abrirla y cerrarla
  // en cada vuelta.
  const navegacion = useRecipientBrowsing(selectedTemplate?.id ?? null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; errors: string[] } | null>(null);
  const [sentLog, setSentLog] = useState<SendLog[]>([]);

  const [schedule, setSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [channelOptions, setChannelOptions] = useState<EmailDeliveryChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const selectedChannel = useMemo(
    () => channelOptions.find((option) => option.id === selectedChannelId) || null,
    [channelOptions, selectedChannelId],
  );

  useEffect(() => {
    sesion.recordar({
      categoriaId: catId,
      plantillaId: selectedTemplate ? String(selectedTemplate.id) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomSubject(selectedTemplate.asunto || '');
      setCustomBody(selectedTemplate.contenido || '');
      setAttachments([]);
      setMotivoId(selectedTemplate.defaultReasonId ?? null);
    } else {
      setSentLog([]);
      setCustomSubject('');
      setCustomBody('');
      setAttachments([]);
      setMotivoId(null);
    }
  }, [selectedTemplate]);

  const usaMotivo = /\{motivo\}/i.test(customBody) || /\{motivo\}/i.test(customSubject);
  const motivoTexto = reasons.find((reason) => reason.id === motivoId)?.text;
  // El motivo se resuelve una sola vez y de ahi salen envio y vista previa.
  const asuntoResuelto = applyReason(customSubject, motivoTexto);
  const cuerpoResuelto = applyReason(customBody, motivoTexto);

  useEffect(() => {
    let active = true;

    async function loadEmailChannels() {
      try {
        const [settings, channels, googleStatus] = await Promise.all([
          getSettings(),
          listChannels().catch(() => []),
          getMyCalendarConnectionStatus().catch(() => null),
        ]);
        if (!active) return;

        const activeProvider = settings.emailProvider || 'gmail';
        const options: EmailDeliveryChannelOption[] = [];

        if (googleStatus?.isConnected && googleStatus.tokenScope?.includes('https://www.googleapis.com/auth/gmail.send')) {
          options.push({
            id: 'gmail-oauth',
            provider: 'gmail',
            label: 'Gmail',
            fromName: googleStatus.googleEmail.split('@')[0] || 'Gmail',
            fromEmail: googleStatus.googleEmail,
            isConnected: true,
            isDefault: activeProvider === 'gmail',
            isActiveProvider: activeProvider === 'gmail',
          });
        }

        channels
          .filter((channel) => channel.isActive)
          .forEach((channel) => {
            options.push({
              id: channel.id,
              provider: 'resend',
              label: channel.channelName,
              fromName: channel.fromName,
              fromEmail: channel.fromEmail,
              isConnected: true,
              isDefault: channel.isDefault,
              isActiveProvider: activeProvider === 'resend' && channel.isDefault,
              dailyLimit: channel.dailyLimit,
            });
          });

        setChannelOptions(options);

        const preferredOption =
          options.find((option) => option.isActiveProvider) ||
          options.find((option) => option.isDefault) ||
          options[0];

        setSelectedChannelId(preferredOption?.id || '');
      } catch {
        if (!active) return;
        setChannelOptions([]);
        setSelectedChannelId('');
      }
    }

    void loadEmailChannels();
    return () => {
      active = false;
    };
  }, []);

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
    return leads.filter((l) => ids.has(l.id!) && puedeRecibirPor(l, 'email'));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead when recipients change
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

  /*
   * Que hace el boton del pie. Ver `WhatsAppSender` para el razonamiento; aca
   * se suma que el correo puede ir programado, y entonces el rotulo lo dice.
   *
   * `missingSchedule` -programar marcado sin fecha u hora- se trata como
   * "enviando": el boton no manda, pero tampoco miente diciendo que falta la
   * plantilla. Los campos vacios estan a la vista, justo encima.
   */
  const faltanDatosDeProgramacion = schedule && (!scheduledDate || !scheduledTime);

  const razonPendiente: SendActionState['razonPendiente'] = !selectedTemplate
    ? 'plantilla'
    : recipients.length === 0
      ? 'destinatarios'
      : sending || faltanDatosDeProgramacion
        ? 'enviando'
        : null;

  const preConfirmSend = () => {
    if (!selectedTemplate) {
      plantillaRef.current?.scrollIntoView({ block: 'nearest' });
      plantillaRef.current?.querySelector('select')?.focus();
      return;
    }
    if (recipients.length === 0) {
      setShowRecipients(true);
      return;
    }
    if (sending || faltanDatosDeProgramacion) return;
    setShowConfirmModal(true);
  };

  const cuenta = recipients.length;
  const plural = cuenta === 1 ? '' : 's';
  const etiquetaAccion = !selectedTemplate
    ? 'Elegí una plantilla'
    : cuenta === 0
      ? 'Elegí destinatarios'
      : sending
        ? 'Enviando mensajes…'
        : faltanDatosDeProgramacion
          ? 'Completá la fecha y la hora'
          : schedule
            ? `Programar envío a ${cuenta} lead${plural}`
            : `Enviar ahora a ${cuenta} lead${plural}`;

  useSendAction(onActionChange, etiquetaAccion, razonPendiente, preConfirmSend);

  const executeSend = async () => {
    setShowConfirmModal(false);
    if (!selectedTemplate || recipients.length === 0) return;
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    if (!userId) return;

    if (schedule && scheduledDate && scheduledTime) {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      setSentLog(
        await scheduleEmailSend(userId, selectedTemplate.id!, recipients, scheduledFor, {
          nombre: selectedTemplate.nombre,
          asunto: asuntoResuelto,
          contenido: cuerpoResuelto,
          isHtml: selectedTemplate.isHtml,
        })
      );
      void getPlatform().storage.local.set({ hasScheduledEmails: true });
      setSchedule(false);
      setScheduledDate('');
      setScheduledTime('');
      setResult({ total: recipients.length, sent: 0, errors: [`${recipients.length} email(s) programados para ${new Date(scheduledFor).toLocaleString('es-CL')}`] });
      return;
    }

    setSending(true);
    const { result: sendResult, sentLog: updatedLog } = await sendImmediateEmail(
      userId,
      selectedTemplate.id!,
      recipients,
      asuntoResuelto,
      cuerpoResuelto,
      selectedTemplate.isHtml,
      attachments,
      selectedChannelId
        ? {
            provider: selectedChannel?.provider,
            channelId: selectedChannel?.provider === 'resend' ? selectedChannelId : undefined,
          }
        : undefined,
      selectedTemplate.nombre,
    );
    setResult(sendResult);
    setSentLog(updatedLog);
    await sesion.refrescarContador();
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      <div ref={plantillaRef}>
      <SendStep
        title="Plantilla"
        actions={
          <>
            {sesion.enviadosHoy > 0 && (
              <Badge tone="success" className="tabular-nums">
                Hoy: {sesion.enviadosHoy}
              </Badge>
            )}
            <SendHistoryDisclosure log={sentLog} templateName={selectedTemplate?.nombre} />
          </>
        }
      >
        <div className="flex flex-col gap-2.5">
          <TemplatePicker
            templates={templates}
            templateLists={templateLists}
            categoryId={catId}
            onCategoryChange={setCatId}
            selectedId={String(selectedTemplate?.id ?? '')}
            onSelect={setSelectedTemplate}
            optionSuffix={(template) => (template.isHtml ? ' (HTML)' : '')}
          />

          {channelOptions.length > 0 && (
            <Field label="Canal remitente">
              <Select value={selectedChannelId} onChange={(e) => setSelectedChannelId(e.target.value)}>
                {channelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.fromEmail}
                    {option.isActiveProvider ? ' · Activo' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </SendStep>
      </div>

      {selectedTemplate ? (
        <SendStep title="Mensaje">
        {usaMotivo && (
          <div className="mb-2.5">
            <Field
              label="Motivo del mensaje"
              hint={
                reasons.length === 0
                  ? 'No hay motivos todavia. Crealos en Plantillas, con "Gestionar motivos".'
                  : 'Sustituye a {motivo} en el asunto y en el cuerpo. Es el mismo para todo este envio.'
              }
            >
              <ReasonPicker motivos={reasons} seleccionado={motivoId} onSeleccionar={setMotivoId} />
            </Field>
          </div>
        )}
        <EmailEditor
            selectedTemplate={selectedTemplate}
            customSubject={customSubject}
            setCustomSubject={setCustomSubject}
            customBody={customBody}
            setCustomBody={setCustomBody}
            attachments={attachments}
            setAttachments={setAttachments}
          setShowPreviewModal={setShowPreviewModal}
        />
        </SendStep>
      ) : (
        <SendRequisito title="Mensaje" requisito="Elegí una plantilla para escribir el correo." />
      )}

      <RecipientSummaryRow
        count={recipients.length}
        names={recipients.map((lead) => lead.name)}
        onOpen={() => setShowRecipients(true)}
      />

      <SendStep title="Cuándo sale">
        <EmailScheduler
          schedule={schedule}
          setSchedule={setSchedule}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          scheduledTime={scheduledTime}
          setScheduledTime={setScheduledTime}
          result={result}
        />
      </SendStep>

      {showRecipients && (
        <RecipientSheet
          leads={leads}
          leadLists={leadLists}
          selectedLeadIds={selectedLeadIds}
          selectedListIds={selectedListIds}
          onToggleLead={toggleLead}
          onToggleList={toggleList}
          onClear={clearRecipients}
          search={navegacion.search}
          onSearchChange={navegacion.setSearch}
          pagina={navegacion.pagina}
          onPaginaChange={navegacion.setPagina}
          ocultarSinNombre={navegacion.ocultarSinNombre}
          onOcultarSinNombreChange={navegacion.setOcultarSinNombre}
          sentLeadIds={sentLeadIds}
          plantillas={templates}
          categorias={templateLists}
          canal="email"
          count={recipients.length}
          onClose={() => setShowRecipients(false)}
        />
      )}

      {showPreviewModal && selectedTemplate && (
        <Modal onClose={() => setShowPreviewModal(false)} maxWidth="480px" label="Vista previa del correo">
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="text-section-title font-semibold text-ink">Vista previa</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
              Cerrar
            </Button>
          </header>

          <div className="border-b border-line px-4 py-3">
            <Field label="Previsualizar como">
              <Select
                value={previewLead?.id ?? ''}
                onChange={(e) => setPreviewLead(leads.find((l) => l.id === e.target.value) || null)}
              >
                <option value="">Elegir destinatario...</option>
                {recipients.slice(0, 20).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </Field>

            {previewLead && (
              <div className="mt-2 rounded-md border border-line bg-surface-muted p-2 text-micro">
                <p className="truncate text-ink-muted">
                  Para: <span className="font-medium text-ink">{previewLead.email}</span>
                </p>
                <p className="truncate text-ink-muted">
                  Asunto:{' '}
                  <span className="font-medium text-ink">{replaceVariables(asuntoResuelto, previewLead)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-surface-muted p-3">
            {previewLead ? (
              <iframe
                srcDoc={replaceVariables(cuerpoResuelto, previewLead)}
                title="Vista previa del correo"
                className="h-[50vh] w-full rounded-md border border-line bg-surface"
                sandbox="allow-same-origin"
              />
            ) : (
              <p className="py-8 text-center text-micro text-ink-muted">
                Elegí un destinatario para ver la previsualización.
              </p>
            )}
          </div>
        </Modal>
      )}

      {showConfirmModal && selectedTemplate && (
        <SendConfirmModal
          title="Confirmar envío"
          subtitle={schedule ? 'El correo quedará programado.' : 'El correo se enviará ahora.'}
          confirmLabel={schedule ? 'Programar envío' : 'Enviar ahora'}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={executeSend}
          rows={[
            { label: 'Plantilla', value: selectedTemplate.nombre },
            { label: 'Asunto', value: customSubject },
            {
              label: `Destinatarios (${recipients.length})`,
              value: <RecipientSummary names={recipients.map((r) => r.name)} />,
            },
            { label: 'Adjuntos', value: attachments.length },
          ]}
        />
      )}
    </div>
  );
}
