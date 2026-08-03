import { useEffect, useMemo, useState } from 'react';
import {
  buildCaptureLinkUrl,
  createMyCaptureLink,
  deactivateMyCaptureLink,
  getMyCaptureLinkStats,
  getMyCaptureLinksLimit,
  listMyCaptureLinks,
  updateMyCaptureLink,
} from '../../services/captureLinksService';
import type { CaptureLink, CaptureLinkStats } from '../../types';
import { Icon } from '../../utils/icons';

interface LinkFormState {
  label: string;
  campaignName: string;
}

const emptyForm: LinkFormState = {
  label: '',
  campaignName: '',
};

function formatPct(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`;
}

function topStats(stats: CaptureLinkStats[]): CaptureLinkStats[] {
  return stats.filter((item) => item.leadsCount > 0).slice(0, 4);
}

export default function CaptureLinksSettings() {
  const [links, setLinks] = useState<CaptureLink[]>([]);
  const [stats, setStats] = useState<CaptureLinkStats[]>([]);
  /** null significa sin limite (admin). Sigue siendo null antes de cargar. */
  const [limit, setLimit] = useState<number | null>(null);
  const [form, setForm] = useState<LinkFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedId) || links[0],
    [links, selectedId]
  );

  const canCreate = limit === null || links.length < limit;
  const slotsText = limit === null ? `${links.length}` : `${links.length}/${limit}`;

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const [nextLinks, nextStats, nextLimit] = await Promise.all([
        listMyCaptureLinks(),
        getMyCaptureLinkStats(),
        getMyCaptureLinksLimit(),
      ]);
      setLinks(nextLinks);
      setStats(nextStats);
      setLimit(nextLimit);
      setSelectedId((current) => current ?? nextLinks[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedStats = useMemo(
    () => topStats(stats.filter((item) => item.captureLinkId === selectedLink?.id)),
    [selectedLink?.id, stats]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (link: CaptureLink) => {
    setEditingId(link.id);
    setForm({ label: link.label, campaignName: link.campaignName });
  };

  const handleSave = async () => {
    const label = form.label.trim();
    if (!label) {
      setError('El nombre del link es obligatorio');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await updateMyCaptureLink(editingId, {
          label,
          campaignName: form.campaignName.trim(),
        });
        setMessage('Link actualizado');
      } else {
        await createMyCaptureLink({
          label,
          campaignName: form.campaignName.trim(),
        });
        setMessage('Link creado');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el link');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (link: CaptureLink) => {
    if (link.isDefault) {
      setError('El link principal no se puede desactivar');
      return;
    }

    if (!confirm(`Desactivar ${link.label}?`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deactivateMyCaptureLink(link.id);
      setMessage('Link desactivado');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar el link');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (link: CaptureLink) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateMyCaptureLink(link.id, {
        label: link.label,
        campaignName: link.campaignName,
        isDefault: true,
        isActive: true,
      });
      setMessage('Link principal actualizado');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el link principal');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (link: CaptureLink) => {
    const url = buildCaptureLinkUrl(link.refCode);
    await navigator.clipboard.writeText(url);
    setMessage('URL copiada');
  };

  if (loading) {
    return <p className="text-sm text-slate-400 py-6">Cargando links de publicacion...</p>;
  }

  return (
    <div className="animate-fade-in pt-2 flex flex-col gap-5">
      <div className="border-y border-slate-200/80 dark:border-slate-700/60 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Links de publicacion</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {limit === null
                ? 'Crea los links que necesites, separa campanas y mide cierre por origen.'
                : `Crea hasta ${limit} links, separa campanas y mide cierre por origen.`}
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            {slotsText}
          </span>
        </div>
      </div>

      {(message || error) && (
        <div className={`text-xs px-3 py-2 rounded border ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
        <input
          value={form.label}
          onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
          placeholder="Nombre del link"
          className="border border-slate-300 dark:border-slate-600/50 rounded px-3 py-2 text-sm bg-transparent"
        />
        <input
          value={form.campaignName}
          onChange={(event) => setForm((current) => ({ ...current, campaignName: event.target.value }))}
          placeholder="Campana"
          className="border border-slate-300 dark:border-slate-600/50 rounded px-3 py-2 text-sm bg-transparent"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || (!editingId && !canCreate)}
          className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          {editingId ? <Icon.Check /> : <Icon.Plus />}
          {editingId ? 'Guardar cambios' : 'Crear link'}
        </button>
        {editingId && (
          <button
            onClick={resetForm}
            className="border border-slate-300 dark:border-slate-600/50 px-3 py-2 rounded text-xs font-semibold text-slate-500 dark:text-slate-300"
          >
            Cancelar
          </button>
        )}
        {!canCreate && !editingId && (
          <span className="text-xs text-amber-600 self-center">Limite de links alcanzado para tu perfil.</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {links.map((link) => {
          const url = buildCaptureLinkUrl(link.refCode);
          const isSelected = selectedLink?.id === link.id;

          return (
            <div
              key={link.id}
              className={`border-l-4 px-3 py-3 rounded-r bg-slate-50/70 dark:bg-slate-900/50 ${isSelected ? 'border-l-blue-600' : 'border-l-slate-300 dark:border-l-slate-600'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setSelectedId(link.id)} className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{link.label}</span>
                    {link.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Principal</span>}
                    {!link.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Inactivo</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">{url}</p>
                </button>
                <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.totalLeads}</p>
                    <p className="text-[10px] text-slate-400">Leads</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.closedLeads}</p>
                    <p className="text-[10px] text-slate-400">Cierre</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPct(link.closeRatePct)}</p>
                    <p className="text-[10px] text-slate-400">Ratio</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => void handleCopy(link)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Icon.Copy /> Copiar
                </button>
                <button onClick={() => startEdit(link)} className="text-xs text-slate-500 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Icon.Edit /> Editar
                </button>
                {!link.isDefault && (
                  <button onClick={() => void handleMakeDefault(link)} className="text-xs text-slate-500 dark:text-slate-300 font-semibold">
                    Hacer principal
                  </button>
                )}
                {!link.isDefault && link.isActive && (
                  <button onClick={() => void handleDeactivate(link)} className="text-xs text-red-600 font-semibold">
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLink && (
        <div className="border-y border-slate-200/80 dark:border-slate-700/60 py-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Analitica de {selectedLink.label}
            </h4>
            <span className="text-[11px] text-slate-400">{selectedLink.campaignName || 'Sin campana'}</span>
          </div>
          {selectedStats.length === 0 ? (
            <p className="text-xs text-slate-400">Aun no hay suficientes leads para mostrar cortes por edad, renta o region.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedStats.map((item) => (
                <div key={`${item.captureLinkId}-${item.ageRange}-${item.incomeRange}-${item.region}-${item.healthSystem}`} className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 rounded px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.leadsCount} leads</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300">{formatPct(item.closeRatePct)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {item.ageRange} - {item.incomeRange}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.region} - {item.healthSystem} - {item.healthProvider}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
