import { Modal } from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import { PIPELINE_STAGES, STATUS_COLORS, STATUS_LABELS, type Lead, type LeadStatus } from '../../types';

/**
 * MOVER UN LEAD DE ETAPA
 *
 * ## Por que existe
 *
 * Arrastrar era el UNICO camino para cambiar el estado de un lead. HTML5
 * drag-and-drop no dispara en tactil, no tiene equivalente en React Native -que
 * es el destino declarado de esta aplicacion- y tampoco funciona con teclado.
 * O sea que la accion central del pipeline no existia para nadie que no usara
 * un raton.
 *
 * El arrastre se conserva como atajo en escritorio, pero deja de ser el unico
 * camino.
 *
 * ## Solo las cuatro etapas reales
 *
 * Los destinos salen de `PIPELINE_STAGES`, que excluye 'nuevo' a proposito y lo
 * explica en su ficha: no es una etapa sino la ausencia de una, y un lead ya
 * gestionado no vuelve a estar sin gestionar; lo apaga solo el trigger de la
 * migracion 062.
 *
 * El tablero anterior lo contradecia: la pestana de "Nuevo" aceptaba que le
 * soltaran leads y escribia ese estado sin filtro, o sea que ofrecia el unico
 * camino de la aplicacion para deshacer algo que el dominio declara
 * irreversible.
 *
 * ## Descartar encadena al motivo
 *
 * Esta en la lista, pero no se aplica directo: abre `DiscardReasonModal`.
 * Descartar sin decir por que era el agujero que ese modal vino a tapar, y el
 * arrastre ya se lo habia saltado una vez.
 */
export function MoveLeadSheet({
  lead,
  onMover,
  onVerDetalle,
  onEscribir,
  onEliminar,
  onClose,
}: {
  lead: Lead;
  onMover: (estado: LeadStatus) => void;
  onVerDetalle: () => void;
  /** Solo se ofrece si hay plantillas de WhatsApp cargadas. */
  onEscribir?: () => void;
  onEliminar: () => void;
  onClose: () => void;
}) {
  const actual = (lead.status || 'nuevo') as LeadStatus;

  return (
    <Modal onClose={onClose} maxWidth="380px" label={`Acciones para ${nombreVisible(lead.name)}`} align="top">
      <div className="flex flex-col">
        <div className="border-b border-line px-4 py-3">
          <p className="truncate text-section-title font-semibold text-ink">{nombreVisible(lead.name)}</p>
          <p className="mt-0.5 text-meta text-ink-secondary">Ahora en {STATUS_LABELS[actual]}</p>
        </div>

        <div className="px-4 py-2">
          <p className="mb-1 text-micro font-bold uppercase tracking-wider text-ink-muted">Mover a</p>
          {PIPELINE_STAGES.map((etapa) => {
            const esActual = etapa === actual;
            return (
              <button
                key={etapa}
                type="button"
                disabled={esActual}
                onClick={() => onMover(etapa)}
                className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors ${
                  esActual ? 'cursor-default' : 'hover:bg-surface-hover'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[etapa] }}
                />
                <span className={`flex-1 text-body ${esActual ? 'text-ink-muted' : 'text-ink'}`}>
                  {STATUS_LABELS[etapa]}
                </span>
                {/*
                  Aca SI corresponde deshabilitar: el motivo esta a la vista, en
                  la linea de arriba. La regla de "nunca deshabilitar" es para
                  cuando la razon queda fuera de la vista y el boton no puede
                  explicarse solo.
                */}
                {esActual && <span className="text-micro text-ink-muted">Actual</span>}
              </button>
            );
          })}
        </div>

        <div className="border-t border-line px-4 py-2">
          <button
            type="button"
            onClick={onVerDetalle}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2 text-left text-body text-ink transition-colors hover:bg-surface-hover"
          >
            <span className="shrink-0 text-ink-muted [&_svg]:h-4 [&_svg]:w-4">{Icon.View()}</span>
            Ver detalle
          </button>

          {onEscribir && (
            <button
              type="button"
              onClick={onEscribir}
              className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2 text-left text-body text-ink transition-colors hover:bg-surface-hover"
            >
              <span className="shrink-0 text-state-success [&_svg]:h-4 [&_svg]:w-4">
                <Icon.WhatsAppOutline />
              </span>
              Escribir por WhatsApp
            </button>
          )}
        </div>

        {/*
          ELIMINAR. Separado del resto por su propia franja, abajo del todo.

          Ojo con la palabra: "Eliminar" NO es lo mismo que "Descartado". Mover
          a Descartado deja al lead en el tablero, con su motivo; eliminar lo
          saca de toda la aplicacion. Por eso viven en bloques distintos y el
          aviso lo dice.

          No lleva dialogo de confirmacion, y es a proposito: el borrado es
          logico -el lead va a la papelera y se puede restaurar-, asi que ya es
          reversible. Poner un modal encima de una accion reversible entrena a
          confirmar sin leer. Quien lo monta muestra un aviso con "Deshacer",
          que es el patron que el producto ya usa en Leads.
        */}
        <div className="border-t border-line px-4 py-2">
          <button
            type="button"
            onClick={onEliminar}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2 text-left text-body text-state-danger transition-colors hover:bg-state-danger-soft"
          >
            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{Icon.Trash()}</span>
            Eliminar lead
          </button>
          <p className="px-2 pb-1 text-micro text-ink-secondary">
            Va a la papelera. No es lo mismo que moverlo a Descartado.
          </p>
        </div>
      </div>
    </Modal>
  );
}
