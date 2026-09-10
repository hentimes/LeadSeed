import { Button, Card, IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import type { MessageFlow } from '../../types';

const CANAL_LABEL = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Llamadas',
} as const;

interface Props {
  flujos: MessageFlow[];
  onAbrirDetalle: (flujo: MessageFlow) => void;
  onInscribir: (flujo: MessageFlow) => void;
  onEditar: (flujo: MessageFlow) => void;
  onEliminar: (flujo: MessageFlow) => void;
}

/**
 * La lista de flujos.
 *
 * ## Por que salio de la pagina
 *
 * `FlowsPage` conmuta entre cinco vistas y cuatro ya delegaban en un
 * componente -`FlowEnrollPanel`, `FlowDetail`, `FlowEditor`, `FlowTodayList`-.
 * Solo esta se dibujaba en linea, y con ella se quedaba dentro del JSX la
 * confirmacion del borrado: veinticuatro lineas de `async` colgadas de un
 * `onClick`.
 *
 * La asimetria era el defecto. Estaba decidida en
 * `docs/architecture/plan-extraccion-archivos-grandes.md` desde antes de este
 * cambio.
 *
 * ## Lo que se queda afuera
 *
 * El dialogo de confirmacion y el `try/catch` del borrado viven en la pagina:
 * este componente avisa que se pulso eliminar y no decide nada. Preguntar es
 * una decision de la pantalla, no de la lista.
 */
export function FlowList({ flujos, onAbrirDetalle, onInscribir, onEditar, onEliminar }: Props) {
  return (
    <Card padding="none">
      <ul className="min-w-0">
        {flujos.map((flujo) => (
          <li
            key={flujo.id}
            className="flex min-w-0 items-center gap-2 border-b border-line-soft px-3 py-2.5 last:border-0"
          >
            <button
              type="button"
              onClick={() => onAbrirDetalle(flujo)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-body font-semibold text-ink">{flujo.name}</span>
              <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                {CANAL_LABEL[flujo.channel]}
                {!flujo.isActive && ' · pausado'}
              </span>
            </button>
            <Button size="sm" onClick={() => onInscribir(flujo)}>
              Inscribir
            </Button>
            <IconButton
              icon={<Icon.Edit />}
              label={`Editar el flujo ${flujo.name}`}
              size="sm"
              className="shrink-0"
              onClick={() => onEditar(flujo)}
            />
            <IconButton
              icon={<Icon.Trash />}
              label={`Eliminar el flujo ${flujo.name}`}
              size="sm"
              variant="ghost-danger"
              className="shrink-0"
              onClick={() => onEliminar(flujo)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
