import { Button, Field, Input, Modal, CardTitle } from '../../../design';
import type { LinkFormState } from '../../../hooks/useFormTypeLinks';

interface Props {
  form: LinkFormState;
  isEditing: boolean;
  saving: boolean;
  onChange: (updater: (current: LinkFormState) => LinkFormState) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Alta y edicion de un link, en una ventana.
 *
 * Antes eran dos campos y un boton siempre presentes en la pagina: 154px por
 * cada tipo de formulario, ocupados el 100% del tiempo para una accion que se
 * hace tantas veces como cupos tenga el perfil y nunca mas. Al editar, ademas,
 * el formulario cambiaba de contenido a varios cientos de pixeles por encima
 * del link pulsado, fuera de la vista.
 */
export default function LinkFormModal({
  form,
  isEditing,
  saving,
  onChange,
  onSave,
  onClose,
}: Props) {
  return (
    <Modal onClose={onClose} maxWidth="320px" label={isEditing ? 'Editar link' : 'Nuevo link'}>
      <div className="flex flex-col gap-3 p-4">
        <CardTitle>{isEditing ? 'Editar link' : 'Nuevo link'}</CardTitle>

        <Field label="Nombre del link">
          <Input
            autoFocus
            value={form.label}
            onChange={(event) => onChange((current) => ({ ...current, label: event.target.value }))}
            placeholder="Ej: Instagram bio"
          />
        </Field>

        <Field label="Campaña" hint="Opcional. Sirve para separar orígenes.">
          <Input
            value={form.campaignName}
            onChange={(event) =>
              onChange((current) => ({ ...current, campaignName: event.target.value }))
            }
            placeholder="Ej: Verano 2026"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
