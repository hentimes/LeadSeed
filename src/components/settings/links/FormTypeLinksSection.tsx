import { Badge, Button, EmptyState, Panel } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { FormType } from '../../../types';
import { useFormTypeLinks } from '../../../hooks/useFormTypeLinks';
import CaptureLinkRow from './CaptureLinkRow';
import CaptureLinkDetail from './CaptureLinkDetail';
import LinkFormModal from './LinkFormModal';

interface Props {
  formType: FormType;
}

/**
 * Links de captura de UN tipo de formulario.
 *
 * Sustituye a la version que mezclaba en 429 lineas la carga de datos, el
 * formulario, la lista y la analitica. El estado vive ahora en
 * `useFormTypeLinks`; aca solo queda como se ve.
 *
 * El concepto de "link principal" y de cupos solo aplica a los tipos abiertos
 * a cualquier usuario: un tipo admin-only no tiene ni default ni limite, y
 * mostrar esa interfaz solo confundiria.
 *
 * ## Sin tarjeta ni encabezado propios
 *
 * El nombre del tipo lo pone ahora la cabecera plegable de `LinksSettings`, y
 * el borde lo pone la caja de Canales. Los que habia aqui eran el tercer marco
 * anidado.
 *
 * El boton de "nuevo link" baja al cuerpo por una razon concreta: la cabecera
 * de `Section` es un `<button>` entero, y un boton dentro de otro boton no es
 * HTML valido -el navegador rompe el arbol y el de dentro deja de ser
 * alcanzable-.
 */
export default function FormTypeLinksSection({ formType }: Props) {
  const links = useFormTypeLinks(formType);

  const cupos = links.canCreate ? 'neutral' : 'warning';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-2">
        {links.showDefaultConcept ? (
          <Badge tone={cupos} className={links.canCreate ? '' : 'cursor-help'}>
            {links.slotsText}
          </Badge>
        ) : (
          <span className="text-micro text-ink-muted">
            {links.links.length} link{links.links.length === 1 ? '' : 's'}
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={<Icon.Plus />}
          disabled={!links.canCreate || links.saving}
          title={links.canCreate ? undefined : 'Alcanzaste el máximo de links de tu perfil'}
          onClick={links.openCreate}
        >
          Nuevo link
        </Button>
      </div>

      {links.error && (
        <div className="pb-2">
          <Panel tone="danger">
            <div className="flex items-start gap-2">
              <p role="alert" className="min-w-0 flex-1 text-micro">
                {links.error}
              </p>
              <button
                type="button"
                onClick={links.dismissError}
                aria-label="Descartar el aviso"
                className="shrink-0 text-micro font-semibold opacity-70 hover:opacity-100"
              >
                <Icon.Close />
              </button>
            </div>
          </Panel>
        </div>
      )}

      {links.message && (
        <div className="pb-2">
          <Panel tone="success">
            <p aria-live="polite" className="text-micro">
              {links.message}
            </p>
          </Panel>
        </div>
      )}

      <div className="mt-2">
        {links.loading ? (
          // Tres huecos del alto real de una fila: la seccion no salta al
          // terminar de cargar.
          <div className="animate-pulse">
            {[0, 1, 2].map((fila) => (
              <div key={fila} className="mb-1.5 h-[52px] rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : links.links.length === 0 ? (
          <div>
            <EmptyState
              icon={<Icon.Lists />}
              title="Sin links todavía"
              description={`Creá el primero para medir visitas y cierre de ${formType.displayName}.`}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-md border border-line">
            {links.links.map((link) => {
              const abierto = links.selectedLink?.id === link.id;

              return (
                <li key={link.id}>
                  <CaptureLinkRow
                    link={link}
                    isOpen={abierto}
                    showDefaultConcept={links.showDefaultConcept}
                    onToggle={() => links.select(link.id)}
                    onCopy={() => void links.copyUrl(link)}
                    onEdit={() => links.openEdit(link)}
                    onMakeDefault={() => void links.makeDefault(link)}
                    onToggleActive={() =>
                      void (link.isActive ? links.deactivate(link) : links.reactivate(link))
                    }
                    onResetProgress={() => void links.resetProgress(link)}
                  />
                  {abierto && (
                    <CaptureLinkDetail
                      id={`link-detalle-${link.id}`}
                      link={link}
                      url={links.urlOf(link)}
                      stats={links.selectedStats}
                      showStats={links.showDefaultConcept}
                      onCopy={() => void links.copyUrl(link)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {links.isFormOpen && (
        <LinkFormModal
          form={links.form}
          isEditing={links.editingId !== null}
          saving={links.saving}
          onChange={links.setForm}
          onSave={() => void links.save()}
          onClose={links.closeForm}
        />
      )}
    </div>
  );
}
