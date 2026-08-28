import { useState } from 'react';
import { createFormType, updateFormType } from '../../services/captureLinksService';
import type { FormType } from '../../types';
import { Icon } from '../../utils/icons';
import { getErrorMessage } from '../../utils/errorMessage';

interface Props {
  formTypes: FormType[];
  onChanged: () => void;
}

interface NewTypeFormState {
  slug: string;
  displayName: string;
  urlTemplate: string;
  linksAdminOnly: boolean;
}

const emptyForm: NewTypeFormState = {
  slug: '',
  displayName: '',
  urlTemplate: 'https://planespro.cl/{slug}/{ref}',
  linksAdminOnly: true,
};

/**
 * Admin-only: registra tipos de formulario nuevos (ej. "form", el
 * formulario simplificado que hoy ya esta desplegado en planespro.cl/form
 * pero sin forma de trackearlo) y permite editar los existentes (activar/
 * desactivar, corregir la URL, abrir/cerrar la creacion de links a todos
 * los usuarios). Una vez registrado, el tipo aparece como una seccion mas
 * de <FormTypeLinksSection> sin necesitar ningun cambio de codigo.
 */
export default function FormTypeRegistryForm({ formTypes, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<NewTypeFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleCreate = async () => {
    const slug = form.slug.trim();
    const displayName = form.displayName.trim();
    const urlTemplate = form.urlTemplate.trim();

    if (!slug || !displayName) {
      setError('Nombre y slug son obligatorios');
      return;
    }
    if (!urlTemplate.includes('{ref}')) {
      setError('La URL debe incluir el placeholder {ref}');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createFormType({ slug, displayName, urlTemplate, linksAdminOnly: form.linksAdminOnly });
      setMessage(`Tipo "${displayName}" registrado`);
      setForm(emptyForm);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el tipo de formulario'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (formType: FormType) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateFormType(formType.slug, { isActive: !formType.isActive });
      setMessage(formType.isActive ? `"${formType.displayName}" desactivado` : `"${formType.displayName}" reactivado`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar el estado del tipo'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdminOnly = async (formType: FormType) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateFormType(formType.slug, { linksAdminOnly: !formType.linksAdminOnly });
      setMessage(
        formType.linksAdminOnly
          ? `Ahora cualquier usuario puede crear links de "${formType.displayName}"`
          : `"${formType.displayName}" vuelve a ser solo para admin`
      );
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar el permiso del tipo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t-2 border-dashed border-line-strong pt-4 mt-2 flex flex-col gap-3">
      <button
        onClick={() => setExpanded((current) => !current)}
        className="text-xs font-bold text-ink-secondary flex items-center gap-1.5 self-start"
      >
        <Icon.Plus />
        Administrar tipos de formulario (admin)
      </button>

      {expanded && (
        <div className="flex flex-col gap-4">
          {(message || error) && (
            <div className={`text-xs px-3 py-2 rounded border ${error ? 'border-state-danger/25 bg-state-danger-soft text-state-danger' : 'border-state-success/25 bg-state-success-soft text-state-success'}`}>
              {error || message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {formTypes.map((formType) => (
              <div key={formType.slug} className="border-l-4 border-l-slate-300 dark:border-l-slate-600 px-3 py-2 rounded-r bg-surface-muted/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-ink">{formType.displayName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-ink-secondary">{formType.slug}</span>
                    {!formType.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-ink-secondary">Inactivo</span>}
                  </div>
                  <p className="text-[11px] text-ink-muted truncate mt-1">{formType.urlTemplate}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={saving}
                    onClick={() => void handleToggleAdminOnly(formType)}
                    className="text-xs text-ink-secondary font-semibold whitespace-nowrap"
                  >
                    {formType.linksAdminOnly ? 'Abrir a todos' : 'Volver a admin-only'}
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => void handleToggleActive(formType)}
                    className={`text-xs font-semibold whitespace-nowrap ${formType.isActive ? 'text-state-danger' : 'text-ink-secondary'}`}
                  >
                    {formType.isActive ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line/80 pt-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-ink-secondary">Registrar formulario nuevo</p>
            <div className="grid grid-cols-1 panel-md:grid-cols-2 gap-2">
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="slug interno (ej: form)"
                className="border border-line-strong rounded px-3 py-2 text-sm bg-transparent"
              />
              <input
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Nombre visible (ej: Formulario simplificado)"
                className="border border-line-strong rounded px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <input
              value={form.urlTemplate}
              onChange={(event) => setForm((current) => ({ ...current, urlTemplate: event.target.value }))}
              placeholder="URL publica con {ref}, ej: https://planespro.cl/form/{ref}"
              className="border border-line-strong rounded px-3 py-2 text-sm bg-transparent"
            />
            <label className="flex items-center gap-2 text-xs text-ink-secondary">
              <input
                type="checkbox"
                checked={form.linksAdminOnly}
                onChange={(event) => setForm((current) => ({ ...current, linksAdminOnly: event.target.checked }))}
              />
              Solo admin puede crear links de este tipo
            </label>
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="bg-primary text-ink-inverse px-3 py-2 rounded-md text-micro font-semibold hover:bg-primary-hover disabled:opacity-40 flex items-center justify-center gap-2 self-start"
            >
              <Icon.Plus />
              Registrar tipo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
