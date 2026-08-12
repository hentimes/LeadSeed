import { useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../services/appSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { getMyCalendarConnectionStatus } from '../services/agendaService';
import { beginGoogleLogin, completeGoogleExtensionLogin } from '../services/authService';
import {
  createChannel,
  listChannels,
  removeChannel,
  updateChannel,
} from '../services/emailChannelsService';
import type { CalendarConnectionStatus, EmailChannelSummary, EmailProvider } from '../types';
import { getPlatform } from '../platform/registry';

export type EmailJsConfig = {
  userId: string;
  serviceId: string;
  templateId: string;
};

export type ChannelDraft = {
  channelName: string;
  fromName: string;
  fromEmail: string;
  apiKey: string;
  dailyLimit: string;
  isDefault: boolean;
};

export const MULTI_CHANNELS_FEATURE = 'pro:multiple_email_channels';
const DEFAULT_CHANNEL_LIMIT = 1;
const EXTENDED_CHANNEL_LIMIT = 6;
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GOOGLE_EMAIL_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send';

export const INITIAL_DRAFT: ChannelDraft = {
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

export function buildDraft(channel?: EmailChannelSummary | null): ChannelDraft {
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

export function useEmailChannels() {
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
          listChannels(),
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
    const nextChannels = await listChannels();
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

      const created = await createChannel({
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

      await updateChannel({
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
      await updateChannel({ id: channel.id, isActive: !channel.isActive });
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
      await removeChannel(channel.id);
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

      const oauthUrl = await beginGoogleLogin(getPlatform().oauth.redirectUrl(), getPlatform().oauth.canCompleteInApp(), {
        scopes: GOOGLE_EMAIL_SCOPES,
      });

      if (!oauthUrl) {
        throw new Error('No se pudo iniciar la conexion con Google.');
      }

      const callbackUrl = await getPlatform().oauth.launch(oauthUrl);

      // Sin callback la plataforma navego fuera: el proveedor traera de vuelta
      // al usuario y no hay nada mas que hacer en este ciclo.
      if (!callbackUrl) return;

      await completeGoogleExtensionLogin(callbackUrl);

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
          await updateChannel({ id: channel.id, isDefault: true, isActive: true });
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

  return {
    provider,
    channels,
    draft,
    setDraft,
    editingChannelId,
    editingDraft,
    setEditingDraft,
    showCreateForm,
    loading,
    creatingChannel,
    busyChannelId,
    errorMessage,
    channelMessage,
    connectingGoogle,
    openChannelMenuId,
    setOpenChannelMenuId,
    openAddMenu,
    setOpenAddMenu,

    multiChannelsEnabled,
    channelLimit,
    canCreateMore,
    detectedGoogleEmail,
    googleConnected,
    googleSendEnabled,
    googleEmail,
    googleStatusLabel,
    canShowGmailRow,
    defaultChannel,
    orderedChannels,

    openCreateForm,
    openEdit,
    closeEdit,
    handleCreateChannel,
    handleSaveEdit,
    handleToggleActive,
    handleDeleteChannel,
    handleConnectGoogle,
    handleActivateProvider,
    setShowCreateForm,
  };
}
