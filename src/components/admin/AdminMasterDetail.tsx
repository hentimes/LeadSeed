import type { ReactNode } from 'react';
import { Icon } from '../../utils/icons';

/**
 * Lista maestra + panel de detalle, el patron que Admin repetia tres veces.
 *
 * Usuarios, Soporte y Catalogo son la misma pantalla: una lista a la izquierda
 * y lo que elijas a la derecha. Cada una lo resolvia por su cuenta, con anchos
 * distintos (`w-1/3` en dos de ellas, rejilla de tarjetas en la tercera) y sin
 * ninguna prevision para el ancho real del panel.
 *
 * ## Por que el umbral es `panel-xl` y no `panel-lg`
 *
 * La cuenta, con el rail de 48px y el relleno del `main`:
 *
 *   panel-lg = 548 - 48 - 24 = 476 utiles
 *     lista 240 + hueco 12 + detalle 224  -> el detalle no sirve
 *   panel-xl = 628 - 48 - 24 = 556 utiles
 *     lista 240 + hueco 12 + detalle 304  -> viable
 *
 * 304px es el minimo con el que una burbuja de chat se lee y una tarjeta de
 * funcionalidad cabe con sus botones. Por debajo, dos columnas es peor que
 * una: se rompen las dos a la vez en vez de una sola.
 *
 * ## Por que la lista mide 240px fijos y no una fraccion
 *
 * Con `w-1/3`, ensanchar el panel ensancha la lista: a 700px la fila de
 * usuario queda con 190px de aire en medio y el detalle se queda corto igual.
 * Con un ancho constante, **todo el ancho que ganes va integro al detalle**,
 * que es donde esta el trabajo. La fila esta calibrada para 240.
 *
 * ## Por que las dos ramas se pintan siempre
 *
 * Se podria medir el ancho y montar una u otra, pero entonces cruzar el umbral
 * desmontaria la lista y perderia su scroll, su seleccion y sus suscripciones.
 * Aca la decision es de CSS: en estrecho el detalle tapa a la lista, que sigue
 * montada debajo. Volver es instantaneo y no recarga nada.
 */
export default function AdminMasterDetail({
  listLabel,
  list,
  detail,
  emptyDetail,
  onBack,
}: {
  /** Rotulo del boton de volver: "Usuarios", "Bandeja", "Catalogo". */
  listLabel: string;
  list: ReactNode;
  /** `null` cuando no hay nada seleccionado. */
  detail: ReactNode | null;
  /** Lo que ve el panel derecho en dos columnas mientras no elijas nada. */
  emptyDetail: ReactNode;
  onBack: () => void;
}) {
  const hayDetalle = detail !== null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 gap-3">
      {/*
        `flex-none` en el punto de corte es lo que hace que la lista NO crezca:
        sin el, el `w-full` de la rama estrecha seguiria vigente y las dos
        columnas se repartirian el ancho a partes iguales, que es justo la
        deformacion que esto viene a arreglar.
      */}
      <div
        className={`min-h-0 min-w-0 flex-col panel-xl:flex panel-xl:w-[240px] panel-xl:flex-none ${
          hayDetalle ? 'hidden' : 'flex w-full'
        }`}
      >
        {list}
      </div>

      {hayDetalle ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex min-h-[44px] shrink-0 items-center gap-1.5 self-start rounded-md px-1 text-body font-medium text-ink-secondary transition-colors hover:text-primary panel-xl:hidden"
          >
            <Icon.ArrowLeft />
            {listLabel}
          </button>
          <div className="min-h-0 flex-1">{detail}</div>
        </div>
      ) : (
        <div className="hidden min-h-0 min-w-0 flex-1 panel-xl:flex">{emptyDetail}</div>
      )}
    </div>
  );
}
