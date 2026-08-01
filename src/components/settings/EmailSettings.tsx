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
    return <div className="pt-2 text-sm text-slate-500">Cargando ajustes de correo...</div>;
  }

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold text-slate-700 dark:border-slate-700/50 dark:text-slate-200">
        Correo y notificaciones
      </h3>

      {s.errorMessage ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{s.errorMessage}</div>
      ) : null}

      {s.channelMessage ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {s.channelMessage}
        </div>
      ) : null}

      <div className="pt-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Canales de correo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {s.channels.length}/{s.channelLimit} canales API. Gmail usa la sesion actual.
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            {!s.multiChannelsEnabled ? (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                1 canal API por plan actual.
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => s.setOpenAddMenu((current) => !current)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {Icon.Plus()}
              Agregar
            </button>

            {s.openAddMenu ? (
              <div className="absolute right-0 top-9 z-40 min-w-[170px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    s.setOpenAddMenu(false);
                    s.openCreateForm();
                  }}
                  disabled={!s.canCreateMore}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
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
            {s.canShowGmailRow ? (
              <div className="px-3 py-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,120px)_48px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Gmail</span>
                      {s.provider === 'gmail' ? <RowPill tone="blue">Activo</RowPill> : null}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">Cuenta Google</div>
                  </div>

                  <div className="truncate text-xs text-slate-600 dark:text-slate-300">{s.googleEmail || 'Sin correo detectado'}</div>

                  <div className="flex items-center gap-2">
                    <StatusBadge label={s.googleStatusLabel} connected={s.googleSendEnabled} />
                  </div>

                  <div className="relative flex items-center justify-start gap-2 sm:justify-end">
                    <ConnectionDot connected={s.googleSendEnabled} />
                    <MenuButton onClick={() => s.setOpenChannelMenuId((current) => (current === GMAIL_ROW_ID ? '' : GMAIL_ROW_ID))} />

                    {s.openChannelMenuId === GMAIL_ROW_ID ? (
                      <div className="absolute right-0 top-9 z-40 min-w-[150px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {s.provider !== 'gmail' ? (
                          <button
                            type="button"
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              void s.handleActivateProvider('gmail');
                            }}
                            disabled={s.busyChannelId === 'gmail'}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
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
                      <MenuButton onClick={() => s.setOpenChannelMenuId((current) => (current === channel.id ? '' : channel.id))} />

                      {s.openChannelMenuId === channel.id ? (
                        <div className="absolute right-0 top-9 z-40 min-w-[155px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {!isActiveProvider ? (
                            <button
                              onClick={() => {
                                s.setOpenChannelMenuId('');
                                void s.handleActivateProvider('resend', channel);
                              }}
                              disabled={isBusy}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
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
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {channel.isActive ? 'Desconectar' : 'Conectar'}
                          </button>
                          <button
                            onClick={() => {
                              s.setOpenChannelMenuId('');
                              void s.handleDeleteChannel(channel);
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
              <div className="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
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
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            EmailJS queda solo como legado. Activa Gmail o un canal Resend para usar el flujo actual.
          </p>
        ) : null}
      </div>
    </div>
  );
}
