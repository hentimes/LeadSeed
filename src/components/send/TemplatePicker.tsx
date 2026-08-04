import { Field, Select } from '../../design';

interface TemplateLike {
  id?: string | number;
  nombre: string;
  templateListIds?: number[];
}

interface TemplateListLike {
  id?: number;
  name: string;
}

/**
 * Selector de categoria + plantilla.
 *
 * Estaba duplicado palabra por palabra en `WhatsAppSender` y `EmailSender`,
 * y `CallSender` tenia una tercera version con otro layout y otro tono. Los
 * tres usan este.
 */
export function TemplatePicker<T extends TemplateLike>({
  templates,
  templateLists,
  categoryId,
  onCategoryChange,
  selectedId,
  onSelect,
  /** "plantilla" en mensajeria, "guion" en llamadas. */
  itemLabel = 'plantilla',
  /** Sufijo opcional por opcion, p. ej. "(HTML)" en email. */
  optionSuffix,
}: {
  templates: T[];
  templateLists: TemplateListLike[];
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  selectedId: string;
  onSelect: (template: T | null) => void;
  itemLabel?: string;
  optionSuffix?: (template: T) => string;
}) {
  const visible = categoryId
    ? templates.filter((template) => (template.templateListIds || []).includes(categoryId))
    : templates;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Categoría">
        <Select
          value={categoryId ?? ''}
          onChange={(event) => {
            onCategoryChange(event.target.value ? Number(event.target.value) : null);
            onSelect(null);
          }}
        >
          <option value="">Todas las categorías</option>
          {templateLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}>
        <Select
          value={selectedId}
          onChange={(event) =>
            onSelect(templates.find((template) => String(template.id ?? '') === event.target.value) || null)
          }
        >
          <option value="">Elegir {itemLabel}...</option>
          {visible.map((template) => (
            <option key={template.id} value={template.id}>
              {template.nombre || '(sin nombre)'}
              {optionSuffix ? optionSuffix(template) : ''}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
