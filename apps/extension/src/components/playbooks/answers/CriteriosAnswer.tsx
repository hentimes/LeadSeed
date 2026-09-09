import type { ReactNode } from 'react';
import { ToggleIconButton } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { EstadoDeImportancia, PlaybookOption, PlaybookSelection } from '../../../types';
import { RespuestaFila } from './RespuestaFila';
import { GrupoDeRadios } from './GrupoDeRadios';

/**
 * Clasificar cada criterio en indispensable, flexible o prescindible.
 *
 * ## Tres radios y no un control ciclico
 *
 * El control de un solo boton que rota entre estados ahorra ANCHO, y aqui el
 * cuello de botella es el ALTO: en 272px los tres caben sin apretar. Ademas
 * obliga a tocar sin saber en que estado vas a caer, que para teclado y lector
 * de pantalla significa escuchar el anuncio despues de cada toque.
 *
 * ## El cuarto estado es no tocar nada
 *
 * "Sin clasificar" se representa como ningun radio marcado, que es valido en
 * ARIA. No se añade un cuarto boton: duplicaria lo que ya significa la
 * ausencia, y contradiria el catalogo de tres estados.
 *
 * ## Un grupo por criterio
 *
 * Y no uno solo para las seis filas: son seis preguntas independientes, no una
 * con dieciocho opciones. El `aria-label` de cada grupo nombra su criterio,
 * para que al entrar por teclado se sepa que se esta clasificando sin depender
 * de haber leido la etiqueta visual un segundo antes.
 *
 * ## La fila y el grupo son compartidos
 *
 * `RespuestaFila` y `GrupoDeRadios` los usan tambien las opciones y el
 * desempate del checkpoint. Esta anatomia estaba copiada en cada cuerpo, y esa
 * es la razon concreta de que los tres acabaran pareciendo distintos.
 */

const ESTADOS: {
  valor: EstadoDeImportancia;
  rotulo: string;
  icono: () => ReactNode;
  tono: 'success' | 'warning' | 'danger';
}[] = [
  { valor: 'indispensable', rotulo: 'Indispensable', icono: Icon.Check, tono: 'success' },
  { valor: 'flexible', rotulo: 'Flexible', icono: Icon.CircleMinus, tono: 'warning' },
  { valor: 'prescindible', rotulo: 'Prescindible', icono: Icon.Ban, tono: 'danger' },
];

interface Props {
  criterios: PlaybookOption[];
  selecciones: PlaybookSelection[];
  soloLectura: boolean;
  onGuardar: (selecciones: PlaybookSelection[]) => void;
}

export default function CriteriosAnswer({
  criterios,
  selecciones,
  soloLectura,
  onGuardar,
}: Props) {
  const estadoDe = new Map(selecciones.map((s) => [s.id, s.value]));

  const clasificar = (id: string, valor: EstadoDeImportancia) => {
    const otras = selecciones.filter((s) => s.id !== id);
    // Volver a tocar el mismo estado lo quita: es como se vuelve a "sin tocar".
    onGuardar(estadoDe.get(id) === valor ? otras : [...otras, { id, value: valor }]);
  };

  if (criterios.length === 0) {
    return (
      <p className="mt-1.5 text-micro text-ink-muted">
        Todavía no hay nada que clasificar: marca opciones en los puntos anteriores primero.
      </p>
    );
  }

  return (
    <ul className="mt-1.5">
      {criterios.map((criterio) => {
        const clasificado = estadoDe.get(criterio.id);
        // Sin clasificar, el tabulador entra por el primero; clasificado, por
        // el que esta activo. Dentro se mueve con flechas.
        const indiceConFoco = clasificado
          ? ESTADOS.findIndex((e) => e.valor === clasificado)
          : 0;

        return (
          <RespuestaFila key={criterio.id} etiqueta={criterio.label}>
            <GrupoDeRadios label={`Clasificación de "${criterio.label}"`}>
              {ESTADOS.map((estado, indice) => {
                const activo = clasificado === estado.valor;

                return (
                  <ToggleIconButton
                    key={estado.valor}
                    active={activo}
                    tono={estado.tono}
                    icon={estado.icono()}
                    role="radio"
                    aria-checked={activo}
                    aria-label={estado.rotulo}
                    title={estado.rotulo}
                    tabIndex={indice === indiceConFoco ? 0 : -1}
                    disabled={soloLectura}
                    onClick={() => clasificar(criterio.id, estado.valor)}
                  />
                );
              })}
            </GrupoDeRadios>
          </RespuestaFila>
        );
      })}
    </ul>
  );
}
