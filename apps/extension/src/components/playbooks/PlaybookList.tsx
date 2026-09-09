import { Badge, EmptyState, IconButton, ListPanel, ListRow } from '../../design';
import { Icon } from '../../utils/icons';
import type { Playbook } from '../../types';

/** Los guiones definidos: abrir para editar, o archivar. */
interface Props {
  lista: Playbook[];
  onEditar: (playbook: Playbook) => void;
  onArchivar: (playbook: Playbook) => void;
}

export default function PlaybookList({ lista, onEditar, onArchivar }: Props) {
  if (lista.length === 0) {
    /*
     * Sin boton. "Nuevo" esta justo encima, siempre visible en esta vista, y
     * los dos hacian exactamente lo mismo: dos llamadas a la accion para una
     * sola accion se leen como dos caminos distintos.
     */
    return (
      <EmptyState
        icon={Icon.Bullseye()}
        title="Todavía no hay ningún guion"
        description="Un guion te ayuda a no perder el hilo en la reunión: fases, preguntas y notas en un solo sitio. Empieza con «Nuevo», aquí arriba."
      />
    );
  }

  return (
    <ListPanel>
      {lista.map((playbook) => (
        <ListRow key={playbook.id}>
          <button
            type="button"
            onClick={() => onEditar(playbook)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-body font-medium text-ink">{playbook.name}</p>
            {!!playbook.description && (
              <p className="truncate text-micro text-ink-muted">{playbook.description}</p>
            )}
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            {!playbook.isActive && <Badge tone="neutral">Archivado</Badge>}
            <IconButton
              icon={playbook.isActive ? Icon.Trash() : Icon.Restore()}
              label={playbook.isActive ? `Archivar "${playbook.name}"` : `Reactivar "${playbook.name}"`}
              variant="ghost"
              size="sm"
              onClick={() => onArchivar(playbook)}
            />
          </div>
        </ListRow>
      ))}
    </ListPanel>
  );
}
