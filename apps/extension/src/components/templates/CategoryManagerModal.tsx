import { Button, IconButton, Input, Modal, Select } from '../../design';
import { Icon } from '../../utils/icons';

/** Paleta de las categorias. Se pasa desde la pagina para no duplicarla. */
export interface OpcionColor {
  name: string;
  value: string;
}

interface Props {
  categorias: Array<{ id: number; name: string; color: string }>;
  colores?: OpcionColor[];
  nombre: string;
  color: string;
  onNombreChange: (valor: string) => void;
  onColorChange: (valor: string) => void;
  onCrear: (e: React.FormEvent) => void;
  onEliminar: (id: number) => void;
  onClose: () => void;
}

/**
 * Administracion de categorias.
 *
 * Mismo motivo que el catalogo de motivos: en un panel dentro de la pagina
 * empujaba la lista de plantillas hacia abajo, y los dos paneles podian estar
 * abiertos a la vez. Aqui la lista tiene scroll propio.
 */
export function CategoryManagerModal({
  categorias,
  colores = [],
  nombre,
  color,
  onNombreChange,
  onColorChange,
  onCrear,
  onEliminar,
  onClose,
}: Props) {
  return (
    <Modal onClose={onClose} maxWidth="400px" label="Categorias">
      <div className="flex max-h-[80vh] min-h-0 flex-col">
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div className="min-w-0">
            <h2 className="text-card-title font-semibold text-ink">Categorias</h2>
            <p className="mt-0.5 text-micro text-ink-secondary">
              Agrupan plantillas para encontrarlas rapido al enviar.
            </p>
          </div>
          <IconButton icon={<Icon.Close />} label="Cerrar" size="sm" onClick={onClose} />
        </div>

        <form onSubmit={onCrear} className="flex gap-2 px-4 pt-3">
          <Input
            value={nombre}
            onChange={(e) => onNombreChange(e.target.value)}
            placeholder="Nueva categoria"
            aria-label="Nombre de la categoria"
            className="min-w-0 flex-1"
            required
            autoFocus
          />
          <Select
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            aria-label="Color"
            fullWidth={false}
            className="w-24 shrink-0"
          >
            {colores.map((c) => (
              <option key={c.value} value={c.value}>{c.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="primary">Crear</Button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {categorias.length === 0 ? (
            <p className="text-micro text-ink-muted">
              Todavia no hay categorias. Por ejemplo: Bienvenida, Seguimiento, Recuperacion.
            </p>
          ) : (
            <ul className="min-w-0">
              {categorias.map((cat) => (
                <li
                  key={cat.id}
                  className="flex min-w-0 items-center gap-2 border-b border-line-soft py-2 last:border-0"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{cat.name}</span>
                  <IconButton
                    icon={<Icon.Trash />}
                    label={`Eliminar la categoria ${cat.name}`}
                    size="sm"
                    variant="ghost-danger"
                    className="shrink-0"
                    onClick={() => onEliminar(cat.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
