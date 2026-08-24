import { Badge, Card, EmptyState, IconButton, Panel, SectionHeader } from '../../../design';
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
 */
export default function FormTypeLinksSection({ formType }: Props) {
  const links = useFormTypeLinks(formType);

  const cupos = links.canCreate ? 'neutral' : 'warning';

  return (
    <Card padding="none">
      <div className="px-3 pt-3">
        <SectionHeader
          icon={<Icon.Lists />}
          title={formType.displayName}
          actions={
            <>
              {links.showDefaultConcept && (
                <Badge
                  tone={cupos}
                  className={links.canCreate ? '' : 'cursor-help'}
                  // El aviso de limite ocupaba una linea propia permanente.
                  // El dato es el mismo contador, solo que en ambar.
                >
                  {links.slotsText}
                </Badge>
              )}
              <IconButton
                size="sm"
                variant="ghost"
                label={
                  links.canCreate
                    ? `Nuevo link de ${formType.displayName}`
                    : 'Alcanzaste el máximo de links de tu perfil'
                }
                icon={<Icon.Plus />}
                disabled={!links.canCreate || links.saving}
                onClick={links.openCreate}
              />
            </>
          }
        />
      </div>

      {links.error && (
        <div className="px-3 pt-2">
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
        <div className="px-3 pt-2">
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
          <div className="animate-pulse px-2.5 pb-3">
            {[0, 1, 2].map((fila) => (
              <div key={fila} className="mb-1.5 h-[52px] rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : links.links.length === 0 ? (
          <div className="pb-2">
            <EmptyState
              icon={<Icon.Lists />}
              title="Sin links todavía"
              description={`Creá el primero para medir visitas y cierre de ${formType.displayName}.`}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-soft border-t border-line-soft">
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
    </Card>
  );
}
