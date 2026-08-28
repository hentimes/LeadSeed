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

  /*
   * Sin nada que elegir, los dos desplegables son un callejon sin salida: el
   * unico contenido es "Elegir plantilla..." y no hay ninguna pista de que
   * primero hay que crearla, ni como llegar ahi. El flujo de envio se moria en
   * el paso 1.
   */
  if (templates.length === 0) {
    // "guions" no existe: el plural en español depende de la terminación, no de
    // pegarle una ese al singular.
    const plural = itemLabel === 'guion' ? 'guiones' : `${itemLabel}s`;

    return (
      <p className="rounded-md border border-dashed border-line bg-surface-sunken px-3 py-2.5 text-meta text-ink-secondary">
        Todavía no tenés {plural} para este canal. Creá {itemLabel === 'guion' ? 'el primero' : 'la primera'}{' '}
        desde <strong className="font-semibold text-ink">Plantillas</strong>, acá arriba.
      </p>
    );
  }

  /*
   * Apilados por defecto, dos columnas desde `panel-sm`. A 320px, dos columnas
   * dejan 112px por `select`, y "Todas las categorias" a 13px pide unos 125: el
   * `select` nativo recorta sin puntos suspensivos y, con los scrollbars
   * ocultos, se pierde texto sin ninguna pista.
   */
  return (
    <div className="grid grid-cols-1 gap-2 panel-sm:grid-cols-2">
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
