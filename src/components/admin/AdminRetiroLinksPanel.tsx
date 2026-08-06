import { useEffect, useState } from 'react';
import {
  buildRetiroLinkUrl,
  createRetiroCaptureLink,
  deactivateMyCaptureLink,
  listRetiroCaptureLinks,
  resetMyCaptureLinkProgress,
  updateMyCaptureLink,
} from '../../services/captureLinksService';
import type { CaptureLink } from '../../types';
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

/**
 * Panel exclusivo de admin para crear y medir links de campana del
 * formulario retiro-tecnico-extranjero (planespro.cl). A diferencia de
 * CaptureLinksSettings (pb, por usuario), estos links no tienen concepto
 * de "principal": todos pertenecen al admin y ninguno es default.
 */
export default function AdminRetiroLinksPanel() {
  const [links, setLinks] = useState<CaptureLink[]>([]);
  const [form, setForm] = useState<LinkFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const nextLinks = await listRetiroCaptureLinks();
      setLinks(nextLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los links de retiro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

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
        await createRetiroCaptureLink({
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

  const handleToggleActive = async (link: CaptureLink) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (link.isActive) {
        await deactivateMyCaptureLink(link.id);
        setMessage('Link desactivado');
      } else {
        await updateMyCaptureLink(link.id, {
          label: link.label,
          campaignName: link.campaignName,
          isActive: true,
        });
        setMessage('Link reactivado');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del link');
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
      setError(err instanceof Error ? err.message : 'No se pudo resetear el contador');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (link: CaptureLink) => {
    const url = buildRetiroLinkUrl(link.refCode);
    await navigator.clipboard.writeText(url);
    setMessage('URL copiada');
  };

  if (loading) {
    return <p className="text-sm text-slate-400 py-6">Cargando links de retiro...</p>;
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Links de retiro-tecnico-extranjero</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Crea un link por campana, mide visitas, pasos completados y leads. Los leads capturados por estos links
          siempre quedan asignados a la cuenta admin.
        </p>
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
          placeholder="Nombre del link / producto"
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
          disabled={saving}
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
      </div>

      <div className="flex flex-col gap-2">
        {links.length === 0 && (
          <p className="text-xs text-slate-400">Todavia no creaste ningun link de retiro.</p>
        )}
        {links.map((link) => {
          const url = buildRetiroLinkUrl(link.refCode);

          return (
            <div
              key={link.id}
              className={`border-l-4 px-3 py-3 rounded-r bg-slate-50/70 dark:bg-slate-900/50 ${link.isActive ? 'border-l-blue-600' : 'border-l-slate-300 dark:border-l-slate-600'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{link.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {link.campaignName || 'Sin campana'}
                    </span>
                    {!link.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Inactivo</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">{url}</p>
                </div>
                <div className="flex items-start gap-1 shrink-0">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.visits}</p>
                      <p className="text-[10px] text-slate-400">Visitas</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.step1Completions}</p>
                      <p className="text-[10px] text-slate-400">Paso 1</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.step2Completions}</p>
                      <p className="text-[10px] text-slate-400">Paso 2</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{link.totalLeads}</p>
                      <p className="text-[10px] text-slate-400">Leads</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatPct(link.closeRatePct)}</p>
                      <p className="text-[10px] text-slate-400">Cierre</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleResetProgress(link)}
                    title="Resetear Visitas/Paso1/Paso2 a cero"
                    className="text-slate-400 hover:text-blue-600 p-1 -mt-1"
                  >
                    <Icon.Restore />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => void handleCopy(link)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Icon.Copy /> Copiar
                </button>
                <button onClick={() => startEdit(link)} className="text-xs text-slate-500 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Icon.Edit /> Editar
                </button>
                <button onClick={() => void handleToggleActive(link)} className={`text-xs font-semibold ${link.isActive ? 'text-red-600' : 'text-slate-500 dark:text-slate-300'}`}>
                  {link.isActive ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
