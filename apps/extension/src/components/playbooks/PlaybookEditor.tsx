import { useState } from 'react';
import { Button, IconButton, Field, Input, Textarea, Notice, Hint } from '../../design';
import { Icon } from '../../utils/icons';
import type { PlaybookContent, Playbook } from '../../types';
import type { PlaybookDraft, PlaybookSectionDraft, PlaybookItemDraft } from '../../services/playbooksService';

/**
 * Editor de un guion: sus fases y sus puntos.
 *
 * ## Reordenar sin arrastrar
 *
 * Con subir y bajar, nunca con un asa de arrastre. En un panel de 272px
 * arrastrar es hostil -y con un guion de diecisiete puntos, imposible sin
 * scroll simultaneo-. El asa ademas invita al gesto que aqui no funciona, asi
 * que no se pinta.
 *
 * ## El borrador vive aca
 *
 * Todo el arbol se edita en memoria y solo cruza al servicio al guardar. Es lo
 * mismo que hace el editor de flujos: guardar fila a fila mientras se teclea
 * deja estados a medias imposibles de deshacer.
 */
interface Props {
  playbook?: Playbook;
  contenido?: PlaybookContent;
  guardando: boolean;
  onGuardar: (draft: PlaybookDraft) => void;
  onCancelar: () => void;
}

function borradorDesde(playbook?: Playbook, contenido?: PlaybookContent): PlaybookDraft {
  if (!playbook || !contenido) {
    return { name: '', description: '', sections: [{ title: 'Fase 1', items: [] }] };
  }

  return {
    id: playbook.id,
    name: playbook.name,
    description: playbook.description ?? '',
    sections: contenido.sections.map((seccion) => ({
      id: seccion.id,
      title: seccion.title,
      items: contenido.items
        .filter((item) => item.sectionId === seccion.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          title: item.title,
          question: item.question,
          support: item.support ?? '',
        })),
    })),
  };
}

/** Devuelve una copia con dos posiciones intercambiadas. Nunca muta. */
function moviendo<T>(lista: T[], indice: number, salto: number): T[] {
  const destino = indice + salto;
  if (destino < 0 || destino >= lista.length) return lista;

  const copia = [...lista];
  const [sacado] = copia.splice(indice, 1);
  if (sacado) copia.splice(destino, 0, sacado);
  return copia;
}

export default function PlaybookEditor({
  playbook,
  contenido,
  guardando,
  onGuardar,
  onCancelar,
}: Props) {
  const [draft, setDraft] = useState<PlaybookDraft>(() => borradorDesde(playbook, contenido));
  const [error, setError] = useState('');

  const cambiarSeccion = (indice: number, cambio: Partial<PlaybookSectionDraft>) =>
    setDraft((actual) => ({
      ...actual,
      sections: actual.sections.map((s, i) => (i === indice ? { ...s, ...cambio } : s)),
    }));

  const cambiarItem = (
    indiceSeccion: number,
    indiceItem: number,
    cambio: Partial<PlaybookItemDraft>,
  ) =>
    setDraft((actual) => ({
      ...actual,
      sections: actual.sections.map((s, i) =>
        i === indiceSeccion
          ? { ...s, items: s.items.map((it, j) => (j === indiceItem ? { ...it, ...cambio } : it)) }
          : s,
      ),
    }));

  const moverItem = (indiceSeccion: number, indiceItem: number, salto: number) =>
    setDraft((actual) => ({
      ...actual,
      sections: actual.sections.map((s, i) =>
        i === indiceSeccion ? { ...s, items: moviendo(s.items, indiceItem, salto) } : s,
      ),
    }));

  return (
    <div className="space-y-3 p-3">
      {!!error && <Notice tone="danger">{error}</Notice>}

      <Field label="Nombre del guion">
        <Input
          value={draft.name}
          onChange={(e) => setDraft((a) => ({ ...a, name: e.target.value }))}
          placeholder="Asesoría PlanesPro"
        />
      </Field>

      <Field label="Descripción" hint="Opcional. Para qué sirve este guion.">
        <Textarea
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => setDraft((a) => ({ ...a, description: e.target.value }))}
        />
      </Field>

      {draft.sections.map((seccion, indiceSeccion) => (
        <div key={seccion.id ?? `nueva-${indiceSeccion}`} className="rounded-md border border-line">
          <div className="flex items-center gap-1.5 border-b border-line bg-surface-muted px-2 py-2">
            <Input
              value={seccion.title}
              onChange={(e) => cambiarSeccion(indiceSeccion, { title: e.target.value })}
              placeholder="Fase 1 · Primera reunión"
            />
            <IconButton
              icon={Icon.Trash()}
              label={`Eliminar la fase "${seccion.title}"`}
              variant="ghost"
              size="sm"
              disabled={draft.sections.length === 1}
              onClick={() =>
                setDraft((a) => ({
                  ...a,
                  sections: a.sections.filter((_, i) => i !== indiceSeccion),
                }))
              }
            />
          </div>

          <ol className="divide-y divide-line">
            {seccion.items.map((item, indiceItem) => (
              <li key={item.id ?? `nuevo-${indiceItem}`} className="flex items-start gap-1.5 p-2">
                {/* Subir y bajar apilados: en 272px no caben en linea junto a
                    eliminar, y verticales se leen como una sola funcion. */}
                <div className="flex shrink-0 flex-col">
                  <IconButton
                    icon={Icon.ChevronUp()}
                    label={`Subir "${item.title || 'este punto'}"`}
                    variant="ghost"
                    size="sm"
                    disabled={indiceItem === 0}
                    onClick={() => moverItem(indiceSeccion, indiceItem, -1)}
                  />
                  <IconButton
                    icon={Icon.ChevronDown()}
                    label={`Bajar "${item.title || 'este punto'}"`}
                    variant="ghost"
                    size="sm"
                    disabled={indiceItem === seccion.items.length - 1}
                    onClick={() => moverItem(indiceSeccion, indiceItem, +1)}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input
                    value={item.title}
                    onChange={(e) => cambiarItem(indiceSeccion, indiceItem, { title: e.target.value })}
                    placeholder="Título del punto"
                  />
                  <Textarea
                    rows={2}
                    value={item.question}
                    onChange={(e) =>
                      cambiarItem(indiceSeccion, indiceItem, { question: e.target.value })
                    }
                    placeholder="La pregunta, tal como se dice en voz alta"
                  />
                  <Textarea
                    rows={2}
                    value={item.support ?? ''}
                    onChange={(e) =>
                      cambiarItem(indiceSeccion, indiceItem, { support: e.target.value })
                    }
                    placeholder="Soporte: pistas de apoyo, separadas por comas"
                  />
                </div>

                <IconButton
                  icon={Icon.Trash()}
                  label={`Eliminar "${item.title || 'este punto'}"`}
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((a) => ({
                      ...a,
                      sections: a.sections.map((s, i) =>
                        i === indiceSeccion
                          ? { ...s, items: s.items.filter((_, j) => j !== indiceItem) }
                          : s,
                      ),
                    }))
                  }
                />
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() =>
              cambiarSeccion(indiceSeccion, {
                items: [...seccion.items, { title: '', question: '', support: '' }],
              })
            }
            className="flex w-full items-center justify-center gap-1.5 border-t border-line px-3 py-2.5 text-meta font-semibold text-primary hover:bg-primary-soft"
          >
            {Icon.Plus()} Agregar punto
          </button>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        icon={Icon.Plus()}
        onClick={() =>
          setDraft((a) => ({
            ...a,
            sections: [...a.sections, { title: `Fase ${a.sections.length + 1}`, items: [] }],
          }))
        }
      >
        Agregar fase
      </Button>

      <Hint>El orden de esta lista es el orden del guion. No hace falta numerarlo a mano.</Hint>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <Button
          variant="primary"
          className="flex-1"
          disabled={guardando}
          onClick={() => {
            setError('');
            try {
              onGuardar(draft);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo guardar');
            }
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar guion'}
        </Button>
        <Button variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
