import { useEffect, useState } from 'react';
import { getPlatform } from '../../platform/registry';
import {
  createMyAvailabilityBlock,
  deleteMyAvailabilityBlock,
  getDefaultAgendaRange,
  getMyCalendarConnectionStatus,
  getMyCalendarSettings,
  listMyAvailabilityBlocks,
  listMyAvailabilityRules,
  saveMyAvailabilityRules,
  subscribeToMyAgendaChanges,
  syncMyGoogleCalendar,
  unsubscribeFromMyAgendaChanges,
  updateMyCalendarSettings,
} from '../../services/agendaService';
import type { AvailabilityBlock, AvailabilityRule, CalendarConnectionStatus, CalendarSettings } from '../../types';
import { Icon } from '../../utils/icons';
import { getErrorMessage } from '../../utils/errorMessage';

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

interface BlockFormState {
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

function todayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultBlockForm(): BlockFormState {
  return {
    date: todayDate(),
    startTime: '09:00',
    endTime: '10:00',
    note: '',
  };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toIsoLocal(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function AgendaSettings() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [blockForm, setBlockForm] = useState<BlockFormState>(defaultBlockForm());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  const loadAgenda = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const range = getDefaultAgendaRange(21);
    try {
      const [nextSettings, nextConnectionStatus, nextRules, nextBlocks] = await Promise.all([
        getMyCalendarSettings(),
        getMyCalendarConnectionStatus(),
        listMyAvailabilityRules(),
        listMyAvailabilityBlocks(range.from, range.to),
      ]);
      setSettings(nextSettings);
      setConnectionStatus(nextConnectionStatus);
      setRules(nextRules);
      setBlocks(nextBlocks);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar la agenda'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda();

    let active = true;
    let channel: Awaited<ReturnType<typeof subscribeToMyAgendaChanges>> = null;

    void subscribeToMyAgendaChanges(() => {
      void loadAgenda(true);
    }).then((nextChannel) => {
      if (!active && nextChannel) {
        void unsubscribeFromMyAgendaChanges(nextChannel);
        return;
      }
      channel = nextChannel;
    });

    return () => {
      active = false;
      if (channel) void unsubscribeFromMyAgendaChanges(channel);
    };
  }, []);

  const updateRule = (dayOfWeek: number, patch: Partial<AvailabilityRule>) => {
    setRules((current) =>
      current.map((rule) => (rule.dayOfWeek === dayOfWeek ? { ...rule, ...patch } : rule))
    );
  };

  const handleSettingsSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const nextSettings = await updateMyCalendarSettings(settings);
      setSettings(nextSettings);
      setMessage('Agenda actualizada');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron guardar los ajustes'));
    } finally {
      setSaving(false);
    }
  };

  const handleRulesSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const nextRules = await saveMyAvailabilityRules(rules);
      setRules(nextRules);
      setMessage('Horario semanal actualizado');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el horario'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) {
      setError('Completa fecha, inicio y termino del bloqueo');
      return;
    }

    const startsAt = toIsoLocal(blockForm.date, blockForm.startTime);
    const endsAt = toIsoLocal(blockForm.date, blockForm.endTime);

    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('El termino debe ser posterior al inicio');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      await createMyAvailabilityBlock({
        startsAt,
        endsAt,
        blockType: 'manual',
        note: blockForm.note.trim(),
      });
      setBlockForm(defaultBlockForm());
      await loadAgenda(true);
      setMessage('Bloqueo creado');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el bloqueo'));
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleSync = async () => {
    setSyncingGoogle(true);
    setMessage('');
    setError('');
    try {
      const result = await syncMyGoogleCalendar(30);
      await loadAgenda(true);
      setMessage(`Google Calendar sincronizado: ${result.busyCount} bloqueos detectados`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo sincronizar Google Calendar'));
      await loadAgenda(true);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleDeleteBlock = async (block: AvailabilityBlock) => {
    if (
      !(await getPlatform().dialogs.confirm('El horario vuelve a quedar disponible para agendar.', {
        title: '¿Eliminar este bloqueo?',
        confirmLabel: 'Eliminar',
        tone: 'danger',
      }))
    ) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteMyAvailabilityBlock(block.id);
      await loadAgenda(true);
      setMessage('Bloqueo eliminado');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el bloqueo'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-ink-muted py-6">Cargando agenda...</p>;
  }

  return (
    <div className="animate-fade-in pt-2 flex flex-col gap-5">
      <div className="border-y border-line/80 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Configuracion de agenda</h3>
            <p className="text-xs text-ink-muted mt-1">
              Define disponibilidad, bloquea horas y sincroniza Google Calendar.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded bg-ink text-ink-inverse">
            Realtime
          </span>
        </div>
      </div>

      {(message || error) && (
        <div className={`text-xs px-3 py-2 rounded border ${error ? 'border-state-danger/25 bg-state-danger-soft text-state-danger' : 'border-state-success/25 bg-state-success-soft text-state-success'}`}>
          {error || message}
        </div>
      )}

      {settings && (
        <div className="border-l-4 border-l-primary bg-surface-muted/70 px-3 py-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-bold text-ink">Google Calendar</p>
              <p className="text-[11px] text-ink-muted truncate">
                {connectionStatus?.isConnected ? connectionStatus.googleEmail || 'Cuenta conectada' : 'Pendiente de reconectar con Google'}
              </p>
              {connectionStatus?.lastSyncFinishedAt && (
                <p className="text-[10px] text-ink-muted">
                  Ultima sync: {formatDateTime(connectionStatus.lastSyncFinishedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-2 py-1 rounded font-semibold ${connectionStatus?.isConnected ? 'bg-state-success-soft text-state-success' : 'bg-state-warning-soft text-state-warning'}`}>
                {connectionStatus?.isConnected ? 'Conectado' : 'Pendiente'}
              </span>
              <button
                type="button"
                onClick={() => void handleGoogleSync()}
                disabled={!connectionStatus?.isConnected || syncingGoogle}
                className="text-xs text-primary font-semibold disabled:opacity-40"
              >
                {syncingGoogle ? 'Sincronizando' : 'Sincronizar'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 panel-md:grid-cols-4 gap-2">
            <label className="text-[11px] font-semibold text-ink-secondary">
              Duracion
              <select
                value={settings.slotDurationMinutes}
                onChange={(event) => setSettings({ ...settings, slotDurationMinutes: Number(event.target.value) })}
                className="mt-1 w-full border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </label>
            <label className="text-[11px] font-semibold text-ink-secondary">
              Buffer
              <select
                value={settings.slotBufferMinutes}
                onChange={(event) => setSettings({ ...settings, slotBufferMinutes: Number(event.target.value) })}
                className="mt-1 w-full border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
              >
                <option value={0}>0 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
              </select>
            </label>
            <label className="text-[11px] font-semibold text-ink-secondary">
              Zona
              <input
                value={settings.timezone}
                onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
                className="mt-1 w-full border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-ink-secondary pt-5">
              <input
                type="checkbox"
                checked={settings.allowPublicBooking}
                onChange={(event) => setSettings({ ...settings, allowPublicBooking: event.target.checked })}
              />
              Booking publico
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleSettingsSave()}
            disabled={saving}
            className="mt-3 bg-primary text-ink-inverse px-3 py-2 rounded-md text-micro font-semibold hover:bg-primary-hover disabled:opacity-40"
          >
            Guardar ajustes
          </button>
        </div>
      )}

      <div className="border-y border-line/80 py-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-ink-secondary">Horario semanal</h4>
          <button
            type="button"
            onClick={() => void handleRulesSave()}
            disabled={saving}
            className="text-xs text-primary font-semibold flex items-center gap-1 disabled:opacity-40"
          >
            <Icon.Check /> Guardar
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div key={rule.dayOfWeek} className="grid grid-cols-[42px_1fr_1fr_54px] items-center gap-2 text-xs">
              <span className="font-bold text-ink-secondary">{dayLabels[rule.dayOfWeek]}</span>
              <input
                type="time"
                value={rule.startTime}
                disabled={!rule.isActive}
                onChange={(event) => updateRule(rule.dayOfWeek, { startTime: event.target.value })}
                className="border border-line-strong rounded px-2 py-1.5 bg-transparent disabled:opacity-40"
              />
              <input
                type="time"
                value={rule.endTime}
                disabled={!rule.isActive}
                onChange={(event) => updateRule(rule.dayOfWeek, { endTime: event.target.value })}
                className="border border-line-strong rounded px-2 py-1.5 bg-transparent disabled:opacity-40"
              />
              <label className="flex items-center justify-end gap-1 text-[11px] text-ink-secondary">
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={(event) => updateRule(rule.dayOfWeek, { isActive: event.target.checked })}
                />
                Activo
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-l-4 border-l-slate-700 dark:border-l-slate-300 bg-surface-muted/70 px-3 py-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-secondary mb-3">Bloquear hora</h4>
        <div className="grid grid-cols-2 panel-md:grid-cols-[1.1fr_0.8fr_0.8fr] gap-2">
          <input
            type="date"
            value={blockForm.date}
            onChange={(event) => setBlockForm((current) => ({ ...current, date: event.target.value }))}
            className="border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
          />
          <input
            type="time"
            value={blockForm.startTime}
            onChange={(event) => setBlockForm((current) => ({ ...current, startTime: event.target.value }))}
            className="border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
          />
          <input
            type="time"
            value={blockForm.endTime}
            onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}
            className="border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
          />
        </div>
        <div className="grid grid-cols-1 panel-md:grid-cols-[1fr_96px] gap-2 mt-2">
          <input
            value={blockForm.note}
            onChange={(event) => setBlockForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Motivo interno"
            className="border border-line-strong rounded px-2 py-1.5 text-xs bg-transparent"
          />
          <button
            type="button"
            onClick={() => void handleCreateBlock()}
            disabled={saving}
            className="bg-ink text-ink-inverse px-3 py-2 rounded text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
          >
            <Icon.Plus /> Bloquear
          </button>
        </div>
      </div>

      <div className="border-y border-line/80 py-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-secondary mb-2">Bloqueos activos</h4>
        <div className="flex flex-col gap-2">
          {blocks.length === 0 ? (
            <p className="text-xs text-ink-muted">Sin bloqueos en los proximos dias.</p>
          ) : (
            blocks.map((block) => (
              <div key={block.id} className="flex items-start justify-between gap-2 border-l-2 border-l-slate-300 dark:border-l-slate-600 pl-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">{formatDateTime(block.startsAt)} - {formatDateTime(block.endsAt)}</p>
                  <p className="text-[11px] text-ink-muted truncate">{block.note || 'Bloqueo manual'}</p>
                </div>
                {block.blockType === 'manual' && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteBlock(block)}
                    className="text-state-danger p-1"
                    title="Eliminar bloqueo"
                  >
                    <Icon.Trash />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
