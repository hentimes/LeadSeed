import { useState } from 'react';
import { SMART_LIST_DEFS } from '../../utils/smartLists';
import { Button, IconButton, Modal, SegmentedControl, Switch } from '../../design';
import { Icon } from '../../utils/icons';
import ListColorEditor from './ListColorEditor';
import type { LeadList } from '../../types';

/**
 * CONFIGURACION DE LISTAS
 *
 * Dos asuntos distintos detras del mismo engranaje: que listas automaticas se
 * ven, y de que color son las propias.
 *
 * ## Por que un conmutador y no las pestanas de icono del producto
 *
 * `RoomInfoTabs` y `SettingsTabs` usan solo iconos porque tienen cinco o seis
 * secciones y los rotulos no entran. Aca son DOS: a 264px interiores quedan
 * 132 por lado, y "Automáticas" y "Mis listas" piden unos 78 y 72. Con sitio
 * de sobra, un par de iconos mudos obligaria a adivinar.
 *
 * ## Por que separadas y no apiladas
 *
 * Son dos asuntos que no se miran a la vez: se entra a encender listas, o se
 * entra a repintar las propias. Apiladas, cada visita obliga a pasar por encima
 * de la otra.
 *
 * Antes habia ademas un motivo de tamano -la seccion de automaticas medía unos
 * 900px con las 17 listas- que ya no aplica: quedan tres. Se anota para que a
 * nadie le extranen las pestanas viendo lo corta que es ahora la primera.
 *
 * ## Por que el dialogo va anclado arriba
 *
 * Las dos secciones tienen alturas muy distintas. Centrado, cada una daba un
 * tope distinto y cambiar de pestana movia el dialogo entero: se leia como un
 * salto, aunque solo hubiera cambiado el contenido. Con `align="top"` la
 * cabecera y las pestanas no se mueven nunca.
 *
 * Por lo mismo, en "Mis listas" el color se cambia con el punto de cada fila y
 * no con una paleta al pie: con treinta listas, esa paleta quedaba despues de
 * treinta filas. Ver `ListColorEditor`.
 *
 * ## Interruptores en vez de dos columnas de casillas
 *
 * Eran dos columnas de ~120px con casillas de 13px: por debajo del objetivo
 * tactil y con los nombres largos ("Nueva Masvida") al limite. Filas de ancho
 * completo con interruptor entran holgadas y se tocan con el dedo.
 */

type Seccion = 'automaticas' | 'colores';

interface Props {
  activeSmartLists: string[];
  /** Listas propias del usuario, las unicas que se pueden repintar. */
  lists: LeadList[];
  onSave: (activeIds: string[]) => void;
  onApplyColor: (ids: number[], color: string) => Promise<void>;
  onClose: () => void;
}

export function SmartListSettingsModal({
  activeSmartLists,
  lists,
  onSave,
  onApplyColor,
  onClose,
}: Props) {
  const [seccion, setSeccion] = useState<Seccion>('automaticas');
  const [selected, setSelected] = useState<Set<string>>(new Set(activeSmartLists));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const byCategory = SMART_LIST_DEFS.reduce(
    (acc, list) => {
      // Se toma la referencia una vez, en vez de comprobar que existe y volver a
      // buscarla en la linea siguiente.
      const delGrupo = acc[list.category] ?? [];
      delGrupo.push(list);
      acc[list.category] = delGrupo;
      return acc;
    },
    {} as Record<string, typeof SMART_LIST_DEFS>
  );

  return (
    <Modal onClose={onClose} maxWidth="400px" label="Configuración de listas" align="top">
      <div className="flex max-h-[70vh] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">Configuración de listas</h2>
          <IconButton icon={<Icon.Close />} label="Cerrar" onClick={onClose} size="sm" />
        </div>

        <div className="px-4 py-2">
          <SegmentedControl
            label="Sección de la configuración"
            value={seccion}
            onChange={setSeccion}
            className="w-full"
            options={[
              { value: 'automaticas', label: 'Automáticas' },
              { value: 'colores', label: 'Mis listas' },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {seccion === 'automaticas' ? (
            <div className="space-y-4">
              <p className="text-meta text-ink-secondary">
                Elegí qué listas automáticas ves en el panel. Se actualizan solas.{' '}
                <span className="font-semibold text-ink">
                  {selected.size} de {SMART_LIST_DEFS.length} activas
                </span>
                .
              </p>

              {Object.entries(byCategory).map(([categoria, listas]) => (
                <div key={categoria}>
                  <h3 className="mb-1 text-micro font-bold uppercase tracking-wider text-ink-muted">
                    {categoria}
                  </h3>

                  <ul className="overflow-hidden rounded-md border border-line">
                    {listas.map((definicion) => (
                      <li key={definicion.id} className="border-b border-line-soft last:border-b-0">
                        <div className="flex min-h-[44px] items-center gap-2 px-3">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-line-soft"
                            style={{ backgroundColor: definicion.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-body text-ink">
                            {definicion.name}
                          </span>
                          <Switch
                            checked={selected.has(definicion.id)}
                            onChange={() => toggle(definicion.id)}
                            label={definicion.name}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ListColorEditor lists={lists} onApply={onApplyColor} />
          )}
        </div>

        {/* Guardar solo aplica a las automaticas: el color se aplica en el acto
            desde su propia seccion, con su propio boton. */}
        {seccion === 'automaticas' && (
          <div className="flex justify-end gap-2 border-t border-line px-4 py-2.5">
            <Button size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => onSave(Array.from(selected))}>
              Guardar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
