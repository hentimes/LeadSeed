import React, { useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../../services/appSettingsService';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCalendarConnectionStatus } from '../../services/agendaService';
import { beginGoogleLogin, completeGoogleExtensionLogin } from '../../services/authService';
import {
  createResendChannel,
  deleteEmailChannel,
  listEmailChannels,
  updateEmailChannel,
} from '../../repositories/emailChannelsRepository';
import type { CalendarConnectionStatus, EmailChannelSummary, EmailProvider } from '../../types';
import { Icon } from '../../utils/icons';

type EmailJsConfig = {
  userId: string;
  serviceId: string;
  templateId: string;
};

type ChannelDraft = {
  channelName: string;
  fromName: string;
  fromEmail: string;
  apiKey: string;
  dailyLimit: string;
  isDefault: boolean;
};

const MULTI_CHANNELS_FEATURE = 'pro:multiple_email_channels';
const DEFAULT_CHANNEL_LIMIT = 1;
const EXTENDED_CHANNEL_LIMIT = 6;
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GOOGLE_EMAIL_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send';
const GMAIL_ROW_ID = 'gmail-row';

const INITIAL_DRAFT: ChannelDraft = {
  channelName: '',
  fromName: '',
  fromEmail: '',
  apiKey: '',
  dailyLimit: '100',
  isDefault: true,
};

function normalizeDailyLimit(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(50000, Math.round(parsed)));
}

function getDefaultChannel(channels: EmailChannelSummary[]) {
  return channels.find((channel) => channel.isDefault) || channels[0] || null;
}

function buildDraft(channel?: EmailChannelSummary | null): ChannelDraft {
  if (!channel) return { ...INITIAL_DRAFT };

  return {
    channelName: channel.channelName || '',
    fromName: channel.fromName || '',
    fromEmail: channel.fromEmail || '',
    apiKey: '',
    dailyLimit: String(channel.dailyLimit || 100),
    isDefault: !!channel.isDefault,
  };
}

function formatProviderLabel(provider: string) {
  if (provider === 'resend') return 'Resend';
  if (provider === 'gmail') return 'Gmail';
  if (provider === 'outlook') return 'Outlook';
  if (provider === 'emailjs') return 'EmailJS';
  return provider || 'Canal';
}

function formatStatusLabel(channel: EmailChannelSummary) {
  if (!channel.isActive) return 'Desconectado';
  if (channel.lastTestStatus === 'invalid_from_email') return 'Remitente invalido';
  if (channel.lastTestStatus === 'sending_only') return 'Conectado';
  if (channel.lastTestStatus === 'verified' || channel.lastTestStatus === 'validated' || channel.lastTestStatus === 'ok') {
    return 'Conectado';
  }
  if (channel.lastTestStatus) return channel.lastTestStatus;
  return 'Conectado';
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />;
}

function StatusBadge({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
  const tone = connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function RowPill({
  tone,
  children,
}: {
  tone: 'blue' | 'slate';
  children: React.ReactNode;
}) {
  const styles =
    tone === 'blue'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles}`}>{children}</span>;
}

function MenuButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {Icon.More()}
    </button>
  );
}

function ChannelEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  saveLabel,
}: {
  draft: ChannelDraft;
  onChange: (next: ChannelDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={draft.channelName}
          onChange={(event) => onChange({ ...draft, channelName: event.target.value })}
          placeholder="Nombre del canal"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-blue-500 dark:border-slate-600/50 dark:bg-slate-800"
        />
        <input
          type="text"
          value={draft.fromName}
          onChange={(event) => onChange({ ...draft, fromName: event.target.value })}
          placeholder="Nombre remitente"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-blue-500 dark:border-slate-600/50 dark:bg-slate-800"
        />
        <input
          type="email"
          value={draft.fromEmail}
          onChange={(event) => onChange({ ...draft, fromEmail: event.target.value })}
          placeholder="correo@dominio.cl"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-blue-500 dark:border-slate-600/50 dark:bg-slate-800"
        />
        <input
          type="number"
          min="1"
          max="50000"
          value={draft.dailyLimit}
          onChange={(event) => onChange({ ...draft, dailyLimit: event.target.value })}
          placeholder="Limite diario"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-blue-500 dark:border-slate-600/50 dark:bg-slate-800"
        />
        <div className="sm:col-span-2">
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onChange({ ...draft, apiKey: event.target.value })}
            placeholder="API key Resend"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-blue-500 dark:border-slate-600/50 dark:bg-slate-800"
          />
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Si editas y no quieres cambiar la clave, deja este campo vacio.
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(event) => onChange({ ...draft, isDefault: event.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Dejar como principal
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Guardando...' : saveLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmailSettings() {
  const { hasFeature, isAdmin, user } = useAuth();
  const [provider, setProvider] = useState<EmailProvider>('gmail');
  const [emailJsConfig, setEmailJsConfig] = useState<EmailJsConfig>({
    userId: '',
    serviceId: '',
    templateId: '',
  });
  const [channels, setChannels] = useState<EmailChannelSummary[]>([]);
  const [draft, setDraft] = useState<ChannelDraft>(INITIAL_DRAFT);
  const [editingChannelId, setEditingChannelId] = useState('');
  const [editingDraft, setEditingDraft] = useState<ChannelDraft>(INITIAL_DRAFT);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [busyChannelId, setBusyChannelId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [channelMessage, setChannelMessage] = useState('');
  const [googleStatus, setGoogleStatus] = useState<CalendarConnectionStatus | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [openChannelMenuId, setOpenChannelMenuId] = useState('');
  const [openAddMenu, setOpenAddMenu] = useState(false);

  const multiChannelsEnabled = isAdmin || hasFeature(MULTI_CHANNELS_FEATURE);
  const channelLimit = multiChannelsEnabled ? EXTENDED_CHANNEL_LIMIT : DEFAULT_CHANNEL_LIMIT;
  const canCreateMore = channels.length < channelLimit;
  const detectedGoogleEmail = String(user?.email || '').trim();
  const googleConnected = googleStatus?.isConnected === true;
  const googleSendEnabled = googleStatus?.tokenScope?.includes(GMAIL_SEND_SCOPE) === true;
  const googleEmail = googleStatus?.googleEmail || detectedGoogleEmail;
  const googleStatusLabel = googleSendEnabled ? 'Conectado' : googleConnected ? 'Falta permiso' : 'Sin conectar';
  const googleActionLabel = googleSendEnabled ? 'Reconectar' : googleConnected ? 'Completar acceso' : 'Conectar';
  const canShowGmailRow = Boolean(googleEmail || detectedGoogleEmail);
  const defaultChannel = useMemo(() => getDefaultChannel(channels), [channels]);
  const orderedChannels = useMemo(
    () =>
      [...channels].sort(
        (left, right) => Number(right.isDefault) - Number(left.isDefault) || right.updatedAt.localeCompare(left.updatedAt),
      ),
    [channels],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMessage('');

        const [settings, nextChannels, nextGoogleStatus] = await Promise.all([
          getSettings(),
          listEmailChannels(),
          getMyCalendarConnectionStatus().catch(() => null),
        ]);
        if (!active) return;

        setProvider(settings.emailProvider || 'gmail');
        setEmailJsConfig({
          userId: settings.emailJSUserId || '',
          serviceId: settings.emailJSServiceId || '',
          templateId: settings.emailJSTemplateId || '',
        });
        setChannels(nextChannels);
        setGoogleStatus(nextGoogleStatus);

        const nextDefaultChannel = getDefaultChannel(nextChannels);
        if (nextDefaultChannel) {
          setDraft((current) => ({
            ...current,
            fromName: current.fromName || nextDefaultChannel.fromName || '',
            fromEmail: current.fromEmail || nextDefaultChannel.fromEmail || '',
          }));
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los ajustes de correo');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const persistSettings = async (nextProvider: EmailProvider, nextEmailJsConfig: EmailJsConfig, nextChannels: EmailChannelSummary[]) => {
    const current = await getSettings();
    const nextDefaultChannel = getDefaultChannel(nextChannels);

    await saveSettings({
      ...current,
      emailProvider: nextProvider,
      resendFromName: nextDefaultChannel?.fromName || '',
      resendFromEmail: nextDefaultChannel?.fromEmail || '',
      emailJSUserId: nextEmailJsConfig.userId,
      emailJSServiceId: nextEmailJsConfig.serviceId,
      emailJSTemplateId: nextEmailJsConfig.templateId,
    });
  };

  const reloadChannels = async () => {
    const nextChannels = await listEmailChannels();
    setChannels(nextChannels);
    return nextChannels;
  };

  const reloadGoogleStatus = async () => {
    const nextStatus = await getMyCalendarConnectionStatus();
    setGoogleStatus(nextStatus);
    return nextStatus;
  };

  const openCreateForm = () => {
    setEditingChannelId('');
    setEditingDraft(INITIAL_DRAFT);
    setShowCreateForm(true);
    setDraft({
      ...INITIAL_DRAFT,
      fromName: defaultChannel?.fromName || '',
      fromEmail: defaultChannel?.fromEmail || '',
      isDefault: channels.length === 0,
    });
  };

  const openEdit = (channel: EmailChannelSummary) => {
    setShowCreateForm(false);
    setDraft(INITIAL_DRAFT);
    setEditingChannelId(channel.id);
    setEditingDraft(buildDraft(channel));
    setChannelMessage('');
    setErrorMessage('');
  };

  const closeEdit = () => {
    setEditingChannelId('');
    setEditingDraft(INITIAL_DRAFT);
  };

  const handleCreateChannel = async () => {
    try {
      if (!canCreateMore) {
        throw new Error(
          multiChannelsEnabled
            ? `Puedes registrar hasta ${channelLimit} canales de correo.`
            : 'Tu plan actual permite un solo canal. Pide acceso a multiples canales para agregar otro.',
        );
      }

      setCreatingChannel(true);
      setChannelMessage('');
      setErrorMessage('');

      const created = await createResendChannel({
        channelName: draft.channelName,
        fromName: draft.fromName,
        fromEmail: draft.fromEmail,
        apiKey: draft.apiKey,
        dailyLimit: normalizeDailyLimit(draft.dailyLimit),
        isDefault: draft.isDefault,
      });

      const nextChannels = draft.isDefault
        ? [created, ...channels.map((channel) => ({ ...channel, isDefault: false }))]
        : [created, ...channels];

      setChannels(nextChannels);
      setProvider('resend');
      await persistSettings('resend', emailJsConfig, nextChannels);
      setDraft({
        ...INITIAL_DRAFT,
        fromName: created.fromName,
        fromEmail: created.fromEmail,
        isDefault: false,
      });
      setShowCreateForm(false);
      setChannelMessage('Canal guardado correctamente.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear el canal');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingChannelId) return;

    try {
      setBusyChannelId(editingChannelId);
      setChannelMessage('');
      setErrorMessage('');

      await updateEmailChannel({
        id: editingChannelId,
        channelName: editingDraft.channelName,
        fromName: editingDraft.fromName,
        fromEmail: editingDraft.fromEmail,
        dailyLimit: normalizeDailyLimit(editingDraft.dailyLimit),
        isDefault: editingDraft.isDefault,
        apiKey: editingDraft.apiKey.trim() || undefined,
      });

      const nextChannels = await reloadChannels();
      await persistSettings(provider, emailJsConfig, nextChannels);
      closeEdit();
      setChannelMessage('Canal actualizado correctamente.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el canal');
    } finally {
      setBusyChannelId('');
    }
  };

  const handleToggleActive = async (channel: EmailChannelSummary) => {
    try {
      setBusyChannelId(channel.id);
      setChannelMessage('');
      setErrorMessage('');
      await updateEmailChannel({ id: channel.id, isActive: !channel.isActive });
      const nextChannels = await reloadChannels();
      await persistSettings(provider, emailJsConfig, nextChannels);
      setChannelMessage(!channel.isActive ? `"${channel.channelName}" quedo conectado.` : `"${channel.channelName}" quedo pausado.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el estado del canal');
    } finally {
      setBusyChannelId('');
    }
  };

  const handleDeleteChannel = async (channel: EmailChannelSummary) => {
    try {
      setBusyChannelId(channel.id);
      setChannelMessage('');
      setErrorMessage('');
      await deleteEmailChannel(channel.id);
      const nextChannels = await reloadChannels();
      await persistSettings(provider, emailJsConfig, nextChannels);
      if (editingChannelId === channel.id) {
        closeEdit();
      }
      setChannelMessage(`"${channel.channelName}" fue eliminado.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el canal');
    } finally {
      setBusyChannelId('');
    }
  };

  const handleConnectGoogle = async () => {
    if (connectingGoogle) return;

    try {
      setConnectingGoogle(true);
      setErrorMessage('');
      setChannelMessage('');

      const isExtension = window.location.protocol === 'chrome-extension:';
      const redirectUrl =
        isExtension && chrome.identity
          ? chrome.identity.getRedirectURL()
          : `${window.location.origin}${window.location.pathname}`;

      const oauthUrl = await beginGoogleLogin(redirectUrl, isExtension, {
        scopes: GOOGLE_EMAIL_SCOPES,
      });

      if (isExtension && oauthUrl && chrome.identity) {
        await new Promise<void>((resolve, reject) => {
          chrome.identity.launchWebAuthFlow({ url: oauthUrl, interactive: true }, async (callbackUrl) => {
            if (chrome.runtime.lastError || !callbackUrl) {
              reject(new Error(chrome.runtime.lastError?.message || 'No se pudo completar la conexion con Google.'));
              return;
            }

            try {
              await completeGoogleExtensionLogin(callbackUrl);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      } else if (oauthUrl) {
        window.location.assign(oauthUrl);
        return;
      } else {
        throw new Error('No se pudo iniciar la conexion con Google.');
      }

      const nextStatus = await reloadGoogleStatus();
      setChannelMessage(
        nextStatus.tokenScope.includes(GMAIL_SEND_SCOPE)
          ? 'La cuenta Google quedo conectada para envio.'
          : 'Google se conecto, pero el permiso de envio no quedo concedido.',
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo conectar Gmail');
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleActivateProvider = async (nextProvider: EmailProvider, channel?: EmailChannelSummary) => {
    try {
      setBusyChannelId(channel?.id || nextProvider);
      setChannelMessage('');
      setErrorMessage('');

      let nextChannels = channels;

      if (nextProvider === 'resend') {
        if (!channel) throw new Error('Selecciona un canal Resend para activarlo');
        if (!channel.isDefault || !channel.isActive) {
          await updateEmailChannel({ id: channel.id, isDefault: true, isActive: true });
          nextChannels = await reloadChannels();
        }
      }

      await persistSettings(nextProvider, emailJsConfig, nextChannels);
      setProvider(nextProvider);
      setChannelMessage(
        nextProvider === 'gmail'
          ? 'Gmail quedo como canal activo por defecto.'
          : `"${channel?.channelName || 'Canal'}" quedo como canal activo por defecto.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo activar el canal');
    } finally {
      setBusyChannelId('');
    }
  };

  if (loading) {
    return <div className="pt-2 text-sm text-slate-500">Cargando ajustes de correo...</div>;
  }

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold text-slate-700 dark:border-slate-700/50 dark:text-slate-200">
        Correo y notificaciones
      </h3>

      {errorMessage ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      {channelMessage ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {channelMessage}
        </div>
      ) : null}

      <div className="pt-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Canales de correo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {channels.length}/{channelLimit} canales API. Gmail usa la sesion actual.
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            {!multiChannelsEnabled ? (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                1 canal API por plan actual.
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setOpenAddMenu((current) => !current)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {Icon.Plus()}
              Agregar
            </button>

            {openAddMenu ? (
              <div className="absolute right-0 top-9 z-40 min-w-[170px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setOpenAddMenu(false);
                    openCreateForm();
                  }}
                  disabled={!canCreateMore}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Nueva API Resend
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenAddMenu(false);
                    void handleConnectGoogle();
                  }}
                  disabled={connectingGoogle || !detectedGoogleEmail}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Agregar Gmail
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-y border-slate-200 dark:border-slate-700">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:grid">
            <span>Canal</span>
            <span>Remitente</span>
            <span>Estado</span>
            <span className="text-right">Menu</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {canShowGmailRow ? (
              <div className="px-3 py-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Gmail</span>
                      {provider === 'gmail' ? <RowPill tone="blue">Activo</RowPill> : null}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">Cuenta Google</div>
                  </div>

                  <div className="truncate text-xs text-slate-600 dark:text-slate-300">{googleEmail || 'Sin correo detectado'}</div>

                  <div className="flex items-center gap-2">
                    <StatusBadge label={googleStatusLabel} connected={googleSendEnabled} />
                  </div>

                  <div className="relative flex items-center justify-start gap-2 sm:justify-end">
                    <ConnectionDot connected={googleSendEnabled} />
                    <MenuButton onClick={() => setOpenChannelMenuId((current) => (current === GMAIL_ROW_ID ? '' : GMAIL_ROW_ID))} />

                    {openChannelMenuId === GMAIL_ROW_ID ? (
                      <div className="absolute right-0 top-9 z-40 min-w-[150px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {provider !== 'gmail' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenChannelMenuId('');
                              void handleActivateProvider('gmail');
                            }}
                            disabled={busyChannelId === 'gmail'}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Activar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenChannelMenuId('');
                            void handleConnectGoogle();
                          }}
                          disabled={connectingGoogle || !detectedGoogleEmail}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {connectingGoogle ? 'Conectando...' : googleConnected ? 'Reconectar' : 'Conectar'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {orderedChannels.map((channel) => {
              const isBusy = busyChannelId === channel.id;
              const isEditing = editingChannelId === channel.id;
              const isActiveProvider = provider === 'resend' && defaultChannel?.id === channel.id;
              const providerLabel = formatProviderLabel(channel.provider);
              const statusLabel = formatStatusLabel(channel);
              const hint = channel.credentialsHint ? ` - ${channel.credentialsHint}` : '';

              return (
                <div key={channel.id} className="px-3 py-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{channel.channelName}</span>
                        {isActiveProvider ? <RowPill tone="blue">Activo</RowPill> : channel.isDefault ? <RowPill tone="slate">Principal</RowPill> : null}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {providerLabel}
                        {hint}
                      </div>
                    </div>

                    <div className="truncate text-xs text-slate-600 dark:text-slate-300">
                      <span className="block truncate">{channel.fromEmail}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {channel.fromName} - {channel.dailyLimit}/dia
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge label={statusLabel} connected={channel.isActive} />
                    </div>

                    <div className="relative flex items-center justify-start gap-2 sm:justify-end">
                      <ConnectionDot connected={channel.isActive} />
                      <MenuButton onClick={() => setOpenChannelMenuId((current) => (current === channel.id ? '' : channel.id))} />

                      {openChannelMenuId === channel.id ? (
                        <div className="absolute right-0 top-9 z-40 min-w-[155px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {!isActiveProvider ? (
                            <button
                              onClick={() => {
                                setOpenChannelMenuId('');
                                void handleActivateProvider('resend', channel);
                              }}
                              disabled={isBusy}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Activar
                            </button>
                          ) : null}
                          <button
                            onClick={() => {
                              setOpenChannelMenuId('');
                              openEdit(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {Icon.Edit()}
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setOpenChannelMenuId('');
                              void handleToggleActive(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {channel.isActive ? 'Desconectar' : 'Conectar'}
                          </button>
                          <button
                            onClick={() => {
                              setOpenChannelMenuId('');
                              void handleDeleteChannel(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {Icon.Trash()}
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <ChannelEditor
                      draft={editingDraft}
                      onChange={setEditingDraft}
                      onSave={() => void handleSaveEdit()}
                      onCancel={closeEdit}
                      saving={isBusy}
                      saveLabel="Guardar"
                    />
                  ) : null}
                </div>
              );
            })}

            {!canShowGmailRow && !orderedChannels.length ? (
              <div className="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                Aun no has registrado canales de correo para esta cuenta.
              </div>
            ) : null}
          </div>
        </div>

        {showCreateForm ? (
          <div className="mt-2">
            <ChannelEditor
              draft={draft}
              onChange={setDraft}
              onSave={() => void handleCreateChannel()}
              onCancel={() => {
                setShowCreateForm(false);
                setDraft(INITIAL_DRAFT);
              }}
              saving={creatingChannel}
              saveLabel="Guardar canal"
            />
          </div>
        ) : null}

        {provider === 'emailjs' ? (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            EmailJS queda solo como legado. Activa Gmail o un canal Resend para usar el flujo actual.
          </p>
        ) : null}
      </div>
    </div>
  );
}
