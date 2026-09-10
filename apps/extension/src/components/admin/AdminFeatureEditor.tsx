import { useState } from 'react';
import type { Feature } from '../../types';
import { Button, Checkbox, Field, Input, Notice, Select, Textarea } from '../../design';
import { getErrorMessage } from '../../utils/errorMessage';
import { validarFeatureId, sugerirFeatureId } from '../../utils/featureId';
import { CATEGORIAS } from '../../config/featureCategories';

/**
 * Alta y edicion de una funcionalidad del catalogo.
 *
 * Era un modal encima de una rejilla de tarjetas. En un panel de 320px un
 * modal sobre un master-detail es una tercera capa de contexto: tapa la lista
 * que te dice donde estabas y no deja comparar con la funcionalidad de al
 * lado. Aqui es el panel de detalle, igual que el editor de plan.
 */
export default function AdminFeatureEditor({
  feature,
  onSave,
  onCancel,
}: {
  /** Sin `id` es un alta. */
  feature: Partial<Feature>;
  onSave: (feature: Partial<Feature>) => Promise<void>;
  onCancel: () => void;
}) {
  const [borrador, setBorrador] = useState<Partial<Feature>>(feature);
  const [guardando, setGuardando] = useState(false);
  /* Una vez que alguien escribe el identificador a mano, deja de seguir al
     nombre: si no, corregir una errata del nombre le pisaria la clave. */
  const [idTocado, setIdTocado] = useState(false);
  const categoria = borrador.category ?? '';
  const [error, setError] = useState('');

  /*
   * No hay efecto que resincronice `borrador` con `feature`: quien monta este
   * formulario le pone `key={id}`, asi que cambiar de funcionalidad ya crea una
   * instancia nueva con su estado limpio. El efecto que habia aqui comparaba
   * **por identidad de objeto**, y en el alta el padre pasa un literal nuevo en
   * cada render: cualquier re-render mientras se escribe habria borrado el
   * formulario a medias.
   */

  const esAlta = !feature.id;

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!borrador.name?.trim()) return;

    /*
     * EL IDENTIFICADOR SE VALIDA AQUI, Y ANTES NI SIQUIERA SE RECOGIA.
     *
     * El formulario tenia un campo rotulado "Codigo" -con la ayuda "es el
     * identificador que consulta el codigo"- enlazado a `name`. El `id` no se
     * pedia en ninguna parte, y `features.id` es `text PRIMARY KEY` sin valor
     * por defecto, asi que el alta violaba la restriccion de no-nulo y fallaba
     * siempre. El campo mentia sobre lo que guardaba.
     */
    if (!borrador.category) {
      setError('Elige una categoría.');
      return;
    }

    const id = (borrador.id ?? '').trim();
    const revision = validarFeatureId(id);
    if (!revision.valido) {
      setError(revision.motivo);
      return;
    }

    setGuardando(true);
    setError('');
    try {
      await onSave({
        ...borrador,
        id,
        trial_days: borrador.trial_days || 0,
        is_active: borrador.is_active ?? true,
      });
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'No se pudo guardar la funcionalidad'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={guardar}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface"
    >
      <div className="shrink-0 border-b border-line bg-surface-muted px-3 py-2">
        <h3 className="truncate text-card-title font-semibold text-ink">
          {borrador.id ? borrador.name : 'Nueva funcionalidad'}
        </h3>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}

        <Field label="Categoría" hint="Agrupa la funcionalidad al componer un plan.">
          <Select
            required
            value={categoria}
            onChange={(event) => {
              const category = event.target.value;
              // La categoria es el primer tramo del identificador sugerido, asi
              // que cambiarla en un alta lo rehace -salvo que ya se haya
              // escrito a mano-.
              setBorrador((actual) => ({
                ...actual,
                category,
                id:
                  esAlta && !idTocado
                    ? sugerirFeatureId(category, actual.name ?? '')
                    : actual.id,
              }));
            }}
          >
            <option value="">Elige una categoría</option>
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Nombre"
          hint="Como se lee en la lista de planes. Este si lleva tildes y espacios."
        >
          <Input
            required
            value={borrador.name || ''}
            onChange={(event) => {
              const name = event.target.value;
              // En el alta el identificador sigue al nombre mientras nadie lo
              // toque a mano. Al editar NO se recalcula: cambiar el
              // identificador romperia todas las comprobaciones del codigo que
              // lo nombran.
              setBorrador((actual) => ({
                ...actual,
                name,
                id: esAlta && !idTocado ? sugerirFeatureId(categoria, name) : actual.id,
              }));
            }}
            placeholder="ej. Importar desde Excel"
          />
        </Field>

        <Field
          label="Identificador"
          hint={
            esAlta
              ? 'La clave que consulta el código. Formato: categoria.funcionalidad'
              : 'No se puede cambiar: el código lo nombra tal cual en las comprobaciones.'
          }
        >
          <Input
            required
            readOnly={!esAlta}
            value={borrador.id || ''}
            onChange={(event) => {
              setIdTocado(true);
              setBorrador({ ...borrador, id: event.target.value });
            }}
            placeholder="ej. contactos.importar"
            className={esAlta ? 'font-mono' : 'font-mono opacity-60'}
          />
        </Field>

        <Field label="Descripción">
          <Textarea
            rows={3}
            value={borrador.description || ''}
            onChange={(event) => setBorrador({ ...borrador, description: event.target.value })}
            placeholder="Qué desbloquea esta funcionalidad..."
          />
        </Field>

        <Field
          label="Días de prueba"
          hint="Si es mayor que 0, cualquier usuario sin plan premium puede activar una prueba temporal."
        >
          <Input
            type="number"
            min="0"
            value={borrador.trial_days ?? 0}
            onChange={(event) =>
              setBorrador({ ...borrador, trial_days: parseInt(event.target.value, 10) || 0 })
            }
          />
        </Field>

        <Checkbox
          label="Funcionalidad activa"
          checked={borrador.is_active !== false}
          onChange={(event) => setBorrador({ ...borrador, is_active: event.target.checked })}
        />
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface-muted px-3 py-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando || !borrador.name?.trim()}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
