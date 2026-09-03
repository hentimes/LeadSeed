import React from 'react';
import type { EmailChannelSummary } from '../../../types';
import { Icon } from '../../../utils/icons';
import type { ChannelDraft } from '../../../hooks/useEmailChannels';

export function formatProviderLabel(provider: string) {
  if (provider === 'resend') return 'Resend';
  if (provider === 'gmail') return 'Gmail';
  if (provider === 'outlook') return 'Outlook';
  if (provider === 'emailjs') return 'EmailJS';
  return provider || 'Canal';
}

export function formatStatusLabel(channel: EmailChannelSummary) {
  if (!channel.isActive) return 'Desconectado';
  if (channel.lastTestStatus === 'invalid_from_email') return 'Remitente invalido';
  if (channel.lastTestStatus === 'sending_only') return 'Conectado';
  if (channel.lastTestStatus === 'verified' || channel.lastTestStatus === 'validated' || channel.lastTestStatus === 'ok') {
    return 'Conectado';
  }
  if (channel.lastTestStatus) return channel.lastTestStatus;
  return 'Conectado';
}

export function ConnectionDot({ connected }: { connected: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-state-success' : 'bg-state-danger'}`} />;
}

export function StatusBadge({ label, connected }: { label: string; connected: boolean }) {
  const tone = connected
    ? 'border-state-success/25 bg-state-success-soft text-state-success'
    : 'border-state-danger/25 bg-state-danger-soft text-state-danger';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function RowPill({ tone, children }: { tone: 'blue' | 'slate'; children: React.ReactNode }) {
  const styles =
    tone === 'blue'
      ? 'border-primary-soft-strong bg-primary-soft text-primary'
      : 'border-line bg-surface-sunken text-ink-secondary';

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles}`}>{children}</span>;
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-secondary transition-colors hover:bg-surface-hover"
    >
      {Icon.More()}
    </button>
  );
}

export function ChannelEditor({
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
    <div className="mt-2 rounded-lg border border-line bg-surface-muted p-2.5">
      <div className="grid grid-cols-1 gap-2 panel-md:grid-cols-2">
        <input
          type="text"
          value={draft.channelName}
          onChange={(event) => onChange({ ...draft, channelName: event.target.value })}
          placeholder="Nombre del canal"
          className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          value={draft.fromName}
          onChange={(event) => onChange({ ...draft, fromName: event.target.value })}
          placeholder="Nombre remitente"
          className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary"
        />
        <input
          type="email"
          value={draft.fromEmail}
          onChange={(event) => onChange({ ...draft, fromEmail: event.target.value })}
          placeholder="correo@dominio.cl"
          className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary"
        />
        <input
          type="number"
          min="1"
          max="50000"
          value={draft.dailyLimit}
          onChange={(event) => onChange({ ...draft, dailyLimit: event.target.value })}
          placeholder="Limite diario"
          className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary"
        />
        <div className="panel-md:col-span-2">
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onChange({ ...draft, apiKey: event.target.value })}
            placeholder="API key Resend"
            className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-[10px] text-ink-secondary">
            Si editas y no quieres cambiar la clave, deja este campo vacio.
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[11px] text-ink-secondary">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(event) => onChange({ ...draft, isDefault: event.target.checked })}
            className="rounded-sm border-line accent-[var(--ls-primary)] focus:ring-1 focus:ring-primary"
          />
          Dejar como principal
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-micro font-semibold text-ink-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Guardando...' : saveLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-ink-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
