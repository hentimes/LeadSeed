import { INITIAL_DRAFT, useEmailChannels } from '../../hooks/useEmailChannels';
import { Icon } from '../../utils/icons';
import {
  ChannelEditor,
  ConnectionDot,
  formatProviderLabel,
  formatStatusLabel,
  MenuButton,
  RowPill,
  StatusBadge,
} from './email/EmailChannelPrimitives';

const GMAIL_ROW_ID = 'gmail-row';

export default function EmailSettings() {
  const s = useEmailChannels();

  if (s.loading) {
    return <div className="pt-2 text-sm text-ink-secondary">Cargando ajustes de correo...</div>;
  }

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="mb-4 border-b border-line pb-2 text-sm font-bold text-ink">
        Correo y notificaciones
      </h3>

      {s.errorMessage ? (
        <div className="mb-3 rounded-lg border border-state-danger/25 bg-state-danger-soft px-3 py-2 text-sm text-state-danger">{s.errorMessage}</div>
      ) : null}

      {s.channelMessage ? (
        <div className="mb-3 rounded-md border border-state-success/25 bg-state-success-soft px-3 py-2 text-micro text-state-success">
          {s.channelMessage}
        </div>
      ) : null}

      <div className="pt-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Canales de correo</p>
            <p className="text-[11px] text-ink-secondary">
              {s.channels.length}/{s.channelLimit} canales API. Gmail usa la sesion actual.
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            {!s.multiChannelsEnabled ? (
              <span className="rounded-md border border-state-warning/25 bg-state-warning-soft px-2 py-1 text-micro font-medium text-state-warning">
                1 canal API por plan actual.
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => s.setOpenAddMenu((current) => !current)}
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover"
            >
              {Icon.Plus()}
              Agregar
            </button>

            {s.openAddMenu ? (
              <div className="absolute right-0 top-9 z-40 min-w-[170px] rounded-md border border-line bg-surface p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    s.setOpenAddMenu(false);
                    s.openCreateForm();
                  }}
                  disabled={!s.canCreateMore}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Nueva API Resend
                </button>
                <button
                  type="button"
                  onClick={() => {
                    s.setOpenAddMenu(false);
                    void s.handleConnectGoogle();
                  }}
                  disabled={s.connectingGoogle || !s.detectedGoogleEmail}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Agregar Gmail
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-y border-line">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] gap-3 bg-surface-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-secondary sm:grid">
            <span>Canal</span>
            <span>Remitente</span>
            <span>Estado</span>
            <span className="text-right">Menu</span>
          </div>

          <div className="divide-y divide-line">
            {s.canShowGmailRow ? (
              <div className="px-3 py-2">
                <div className="grid grid-cols-1 gap-2 panel-md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] panel-md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">Gmail</span>
                      {s.provider === 'gmail' ? <RowPill tone="blue">Activo</RowPill> : null}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-ink-secondary">Cuenta Google</div>
                  </div>

                  <div className="truncate text-xs text-ink-secondary">{s.googleEmail || 'Sin correo detectado'}</div>

                  <div className="flex items-center gap-2">
                    <StatusBadge label={s.googleStatusLabel} connected={s.googleSendEnabled} />
                  </div>

                  <div className="relative flex items-center justify-start gap-2 panel-md:justify-end">
                    <ConnectionDot connected={s.googleSendEnabled} />
                    <MenuButton onClick={() => s.setOpenChannelMenuId((current) => (current === GMAIL_ROW_ID ? '' : GMAIL_ROW_ID))} />

                    {s.openChannelMenuId === GMAIL_ROW_ID ? (
                      <div className="absolute right-0 top-9 z-40 min-w-[150px] rounded-md border border-line bg-surface p-1 shadow-lg">
                        {s.provider !== 'gmail' ? (
                          <button
                            type="button"
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              void s.handleActivateProvider('gmail');
                            }}
                            disabled={s.busyChannelId === 'gmail'}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Activar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            s.setOpenChannelMenuId('');
                            void s.handleConnectGoogle();
                          }}
                          disabled={s.connectingGoogle || !s.detectedGoogleEmail}
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {s.connectingGoogle ? 'Conectando...' : s.googleConnected ? 'Reconectar' : 'Conectar'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {s.orderedChannels.map((channel) => {
              const isBusy = s.busyChannelId === channel.id;
              const isEditing = s.editingChannelId === channel.id;
              const isActiveProvider = s.provider === 'resend' && s.defaultChannel?.id === channel.id;
              const providerLabel = formatProviderLabel(channel.provider);
              const statusLabel = formatStatusLabel(channel);
              const hint = channel.credentialsHint ? ` - ${channel.credentialsHint}` : '';

              return (
                <div key={channel.id} className="px-3 py-2">
                  <div className="grid grid-cols-1 gap-2 panel-md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] panel-md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{channel.channelName}</span>
                        {isActiveProvider ? <RowPill tone="blue">Activo</RowPill> : channel.isDefault ? <RowPill tone="slate">Principal</RowPill> : null}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-ink-secondary">
                        {providerLabel}
                        {hint}
                      </div>
                    </div>

                    <div className="truncate text-xs text-ink-secondary">
                      <span className="block truncate">{channel.fromEmail}</span>
                      <span className="block truncate text-[11px] text-ink-secondary">
                        {channel.fromName} - {channel.dailyLimit}/dia
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge label={statusLabel} connected={channel.isActive} />
                    </div>

                    <div className="relative flex items-center justify-start gap-2 panel-md:justify-end">
                      <ConnectionDot connected={channel.isActive} />
                      <MenuButton onClick={() => s.setOpenChannelMenuId((current) => (current === channel.id ? '' : channel.id))} />

                      {s.openChannelMenuId === channel.id ? (
                        <div className="absolute right-0 top-9 z-40 min-w-[155px] rounded-md border border-line bg-surface p-1 shadow-lg">
                          {!isActiveProvider ? (
                            <button
                              onClick={() => {
                                s.setOpenChannelMenuId('');
                                void s.handleActivateProvider('resend', channel);
                              }}
                              disabled={isBusy}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Activar
                            </button>
                          ) : null}
                          <button
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              s.openEdit(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {Icon.Edit()}
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              void s.handleToggleActive(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {channel.isActive ? 'Desconectar' : 'Conectar'}
                          </button>
                          <button
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              void s.handleDeleteChannel(channel);
                            }}
                            disabled={isBusy}
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-state-danger transition-colors hover:bg-state-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
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
                      draft={s.editingDraft}
                      onChange={s.setEditingDraft}
                      onSave={() => void s.handleSaveEdit()}
                      onCancel={s.closeEdit}
                      saving={isBusy}
                      saveLabel="Guardar"
                    />
                  ) : null}
                </div>
              );
            })}

            {!s.canShowGmailRow && !s.orderedChannels.length ? (
              <div className="px-3 py-6 text-sm text-ink-secondary">
                Aun no has registrado canales de correo para esta cuenta.
              </div>
            ) : null}
          </div>
        </div>

        {s.showCreateForm ? (
          <div className="mt-2">
            <ChannelEditor
              draft={s.draft}
              onChange={s.setDraft}
              onSave={() => void s.handleCreateChannel()}
              onCancel={() => {
                s.setShowCreateForm(false);
                s.setDraft(INITIAL_DRAFT);
              }}
              saving={s.creatingChannel}
              saveLabel="Guardar canal"
            />
          </div>
        ) : null}

        {s.provider === 'emailjs' ? (
          <p className="mt-2 text-[11px] text-ink-secondary">
            EmailJS queda solo como legado. Activa Gmail o un canal Resend para usar el flujo actual.
          </p>
        ) : null}
      </div>
    </div>
  );
}
