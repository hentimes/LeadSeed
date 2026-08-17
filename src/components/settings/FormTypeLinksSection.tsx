import { useEffect, useMemo, useState } from 'react';
import {
  buildLinkUrl,
  createMyCaptureLink,
  deactivateMyCaptureLink,
  getMyCaptureLinkStats,
  getMyCaptureLinksLimit,
  listMyCaptureLinks,
  resetMyCaptureLinkProgress,
  updateMyCaptureLink,
} from '../../services/captureLinksService';
import type { CaptureLink, CaptureLinkStats, FormType } from '../../types';
import { Icon } from '../../utils/icons';
import { getErrorMessage } from '../../utils/errorMessage';

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

interface Props {
  formType: FormType;
}

/**
 * Seccion de links para UN tipo de formulario (pb, retiro, o cualquier tipo
 * registrado despues). Reemplaza lo que antes eran dos componentes
 * separados (CaptureLinksSettings solo para pb, AdminRetiroLinksPanel solo
 * para retiro) parametrizando por FormType en vez de hardcodear el tipo.
 *
 * El concepto de "link principal"/limite de cupos solo aplica a tipos
 * abiertos a todos los usuarios (formType.linksAdminOnly === false, hoy
 * solo 'pb'): un tipo admin-only no tiene default ni limite (el admin ya es
 * ilimitado), asi que esa UI se omite para no confundir.
 */
export default function FormTypeLinksSection({ formType }: Props) {
  const [links, setLinks] = useState<CaptureLink[]>([]);
  const [stats, setStats] = useState<CaptureLinkStats[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [form, setForm] = useState<LinkFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showDefaultConcept = !formType.linksAdminOnly;

  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedId) || links[0],
    [links, selectedId]
  );

  const canCreate = !showDefaultConcept || limit === null || links.length < limit;
  const slotsText = limit === null ? `${links.length}` : `${links.length}/${limit}`;

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const [nextLinks, nextStats, nextLimit] = await Promise.all([
        listMyCaptureLinks(formType.slug),
        getMyCaptureLinkStats(),
        getMyCaptureLinksLimit(),
      ]);
      setLinks(nextLinks);
      setStats(nextStats);
      setLimit(nextLimit);
      setSelectedId((current) => current ?? nextLinks[0]?.id ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los links'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType.slug]);

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
          linkType: formType.slug,
        });
        setMessage('Link creado');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el link'));
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
      setError(getErrorMessage(err, 'No se pudo desactivar el link'));
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (link: CaptureLink) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateMyCaptureLink(link.id, {
        label: link.label,
        campaignName: link.campaignName,
        isActive: true,
      });
      setMessage('Link reactivado');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo reactivar el link'));
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
      setError(getErrorMessage(err, 'No se pudo cambiar el link principal'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = async (link: CaptureLink) => {
    if (!confirm(`Resetear Visitas/Paso 1/Paso 2 de "${link.label}" a cero? Los leads ya capturados no se ven afectados.`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await resetMyCaptureLinkProgress(link.id);
      setMessage('Contador reseteado');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo resetear el contador'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (link: CaptureLink) => {
    const url = buildLinkUrl(formType, link.refCode);
    await navigator.clipboard.writeText(url);
    setMessage('URL copiada');
  };

  if (loading) {
    return <p className="text-sm text-ink-muted py-6">Cargando links de {formType.displayName}...</p>;
  }

  return (
    <div className="animate-fade-in pt-2 flex flex-col gap-5">
      <div className="border-y border-line/80 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink">{formType.displayName}</h3>
            <p className="text-xs text-ink-muted mt-1">
              {showDefaultConcept
                ? limit === null
                  ? 'Crea los links que necesites, separa campanas y mide cierre por origen.'
                  : `Crea hasta ${limit} links, separa campanas y mide cierre por origen.`
                : 'Crea un link por campana, mide visitas, pasos completados y leads.'}
            </p>
          </div>
          {showDefaultConcept && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-900 text-white dark:text-slate-900">
              {slotsText}
            </span>
          )}
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
          className="border border-line-strong rounded px-3 py-2 text-sm bg-transparent"
        />
        <input
          value={form.campaignName}
          onChange={(event) => setForm((current) => ({ ...current, campaignName: event.target.value }))}
          placeholder="Campana"
          className="border border-line-strong rounded px-3 py-2 text-sm bg-transparent"
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
            className="border border-line-strong px-3 py-2 rounded text-xs font-semibold text-ink-secondary"
          >
            Cancelar
          </button>
        )}
        {!canCreate && !editingId && (
          <span className="text-xs text-amber-600 self-center">Limite de links alcanzado para tu perfil.</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {links.length === 0 && (
          <p className="text-xs text-ink-muted">Todavia no creaste ningun link de {formType.displayName}.</p>
        )}
        {links.map((link) => {
          const url = buildLinkUrl(formType, link.refCode);
          const isSelected = selectedLink?.id === link.id;

          return (
            <div
              key={link.id}
              className={`border-l-4 px-3 py-3 rounded-r bg-surface-muted/70 ${isSelected ? 'border-l-blue-600' : 'border-l-slate-300 dark:border-l-slate-600'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setSelectedId(link.id)} className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-ink truncate">{link.label}</span>
                    {showDefaultConcept && link.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Principal</span>
                    )}
                    {!showDefaultConcept && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-ink-secondary">
                        {link.campaignName || 'Sin campana'}
                      </span>
                    )}
                    {!link.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-ink-secondary">Inactivo</span>}
                  </div>
                  <p className="text-[11px] text-ink-muted truncate mt-1">{url}</p>
                </button>
                <div className="flex items-start gap-1 shrink-0">
                  <div className="grid grid-cols-6 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-ink">{link.visits}</p>
                      <p className="text-[10px] text-ink-muted">Visitas</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{link.step1Completions}</p>
                      <p className="text-[10px] text-ink-muted">Paso 1</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{link.step2Completions}</p>
                      <p className="text-[10px] text-ink-muted">Paso 2</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{link.totalLeads}</p>
                      <p className="text-[10px] text-ink-muted">Leads</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{link.closedLeads}</p>
                      <p className="text-[10px] text-ink-muted">Cierre</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{formatPct(link.closeRatePct)}</p>
                      <p className="text-[10px] text-ink-muted">Ratio</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleResetProgress(link)}
                    title="Resetear Visitas/Paso1/Paso2 a cero"
                    className="text-ink-muted hover:text-blue-600 p-1 -mt-1"
                  >
                    <Icon.Restore />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => void handleCopy(link)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Icon.Copy /> Copiar
                </button>
                <button onClick={() => startEdit(link)} className="text-xs text-ink-secondary font-semibold flex items-center gap-1">
                  <Icon.Edit /> Editar
                </button>
                {showDefaultConcept ? (
                  <>
                    {!link.isDefault && (
                      <button onClick={() => void handleMakeDefault(link)} className="text-xs text-ink-secondary font-semibold">
                        Hacer principal
                      </button>
                    )}
                    {!link.isDefault && link.isActive && (
                      <button onClick={() => void handleDeactivate(link)} className="text-xs text-red-600 font-semibold">
                        Desactivar
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => void (link.isActive ? handleDeactivate(link) : handleReactivate(link))}
                    className={`text-xs font-semibold ${link.isActive ? 'text-red-600' : 'text-ink-secondary'}`}
                  >
                    {link.isActive ? 'Desactivar' : 'Reactivar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showDefaultConcept && selectedLink && (
        <div className="border-y border-line/80 py-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Analitica de {selectedLink.label}
            </h4>
            <span className="text-[11px] text-ink-muted">{selectedLink.campaignName || 'Sin campana'}</span>
          </div>
          {selectedStats.length === 0 ? (
            <p className="text-xs text-ink-muted">Aun no hay suficientes leads para mostrar cortes por edad, renta o region.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedStats.map((item) => (
                <div key={`${item.captureLinkId}-${item.ageRange}-${item.incomeRange}-${item.region}-${item.healthSystem}`} className="bg-blue-50/70 border border-blue-100 dark:border-blue-900/60 rounded px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">{item.leadsCount} leads</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300">{formatPct(item.closeRatePct)}</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary mt-1 truncate">
                    {item.ageRange} - {item.incomeRange}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
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
