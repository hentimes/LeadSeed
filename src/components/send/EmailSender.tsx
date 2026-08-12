import { useState, useMemo, useEffect } from 'react';
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
import { getSettings } from '../../services/appSettingsService';
import { getMyCalendarConnectionStatus } from '../../services/agendaService';
import { listChannels } from '../../services/emailChannelsService';
import { Button, Field, Modal, Select } from '../../design';
import { SendStep } from './SendStep';
import { TemplatePicker } from './TemplatePicker';
import { RecipientPicker, RecipientCount } from './RecipientPicker';
import { SendConfirmModal, RecipientSummary } from './SendConfirmModal';
import { SendHistoryDisclosure } from './SendHistoryDisclosure';
import { webStorage } from '../../platform/web';

interface Props {
  leads: Lead[];
  templates: EmailTemplate[];
  templateLists: EmailTemplateList[];
  leadLists: LeadList[];
}

export default function EmailSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Edición dinámica
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());

  const [leadSearch, setLeadSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; errors: string[] } | null>(null);
  const [sentLog, setSentLog] = useState<SendLog[]>([]);

  const [schedule, setSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [channelOptions, setChannelOptions] = useState<EmailDeliveryChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const selectedChannel = useMemo(
    () => channelOptions.find((option) => option.id === selectedChannelId) || null,
    [channelOptions, selectedChannelId],
  );

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomSubject(selectedTemplate.asunto || '');
      setCustomBody(selectedTemplate.contenido || '');
      setAttachments([]);
    } else {
      setSentLog([]);
      setCustomSubject('');
      setCustomBody('');
      setAttachments([]);
    }
  }, [selectedTemplate]);

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
          .filter((channel: any) => channel.isActive)
          .forEach((channel: any) => {
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

  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead when recipients change
  useEffect(() => {
    if (recipients.length > 0 && !previewLead) {
      setPreviewLead(recipients[0]);
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

    if (schedule && scheduledDate && scheduledTime) {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      setSentLog(await scheduleEmailSend(userId, selectedTemplate.id!, recipients, scheduledFor));
      void webStorage.local.set({ hasScheduledEmails: true });
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
      customSubject,
      customBody,
      selectedTemplate.isHtml,
      attachments,
      selectedChannelId
        ? {
            provider: selectedChannel?.provider,
            channelId: selectedChannel?.provider === 'resend' ? selectedChannelId : undefined,
          }
        : undefined,
    );
    setResult(sendResult);
    setSentLog(updatedLog);
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      <SendStep step={1} title="Plantilla">
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

      <SendStep step={2} title="Mensaje" disabled={!selectedTemplate}>
        {selectedTemplate ? (
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
        ) : (
          <p className="text-micro text-ink-muted">Elegí una plantilla para editar el correo.</p>
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
          secondaryField="email"
        />
      </SendStep>

      <SendStep step={4} title="Enviar">
        <div className="flex flex-col gap-2.5">
          <EmailScheduler
            schedule={schedule}
            setSchedule={setSchedule}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            preConfirmSend={preConfirmSend}
            sending={sending}
            selectedTemplate={selectedTemplate}
            recipients={recipients}
            result={result}
          />
          <SendHistoryDisclosure log={sentLog} templateName={selectedTemplate?.nombre} />
        </div>
      </SendStep>

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
                  <span className="font-medium text-ink">{replaceVariables(customSubject, previewLead)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-surface-muted p-3">
            {previewLead ? (
              <iframe
                srcDoc={replaceVariables(customBody, previewLead)}
                title="Vista previa del correo"
                className="h-[50vh] w-full rounded-md border border-line bg-white"
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
