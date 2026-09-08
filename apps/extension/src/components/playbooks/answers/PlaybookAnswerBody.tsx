import { Textarea } from '../../../design';
import { opcionesDisponibles } from '../../../utils/playbookAnswers';
import type { PlaybookAnswerType, PlaybookRunItem, PlaybookSelection } from '../../../types';
import OpcionesAnswer from './OpcionesAnswer';
import CriteriosAnswer from './CriteriosAnswer';
import CheckpointAnswer from './CheckpointAnswer';

/**
 * QUE SE PINTA AL ABRIR UN PUNTO.
 *
 * Este archivo concentra todo lo que depende del tipo de respuesta: el cuerpo
 * -abajo, en el componente- y si la pregunta se pinta -aqui, en la funcion-.
 * `PlaybookRunItemRow` no conoce ninguno de los cinco tipos: se ocupa de abrir,
 * cerrar y marcar, que es lo mismo para todos.
 *
 * `texto` es el caso por defecto y el de los diecisiete puntos de siempre.
 */

/**
 * Si la pregunta del punto se pinta encima del cuerpo.
 *
 * Vive aqui, junto al mapeo tipo->componente, y no en la fila: asi la fila
 * sigue sin conocer los tipos -llama a una funcion con nombre, no hace un
 * `switch`- y la decision tiene una sola fuente.
 *
 * El checkpoint es el unico que la oculta, y por una razon concreta: su
 * pregunta es "quieres mejorar ___, mantener ___ y no es indispensable ___",
 * o sea la MISMA frase que se pinta debajo ya con los huecos rellenos. Se leia
 * dos veces, una de ellas con guiones bajos.
 */
export function ocultaPregunta(answerType: PlaybookAnswerType): boolean {
  return answerType === 'checkpoint';
}

interface Props {
  item: PlaybookRunItem;
  todos: readonly PlaybookRunItem[];
  soloLectura: boolean;
  nota: string;
  onCambiarNota: (nota: string) => void;
  onGuardarNota: () => void;
  onGuardarSelecciones: (selecciones: PlaybookSelection[]) => void;
  onGuardarTextoDeCheckpoint: (texto: string | null) => void;
}

export default function PlaybookAnswerBody({
  item,
  todos,
  soloLectura,
  nota,
  onCambiarNota,
  onGuardarNota,
  onGuardarSelecciones,
  onGuardarTextoDeCheckpoint,
}: Props) {
  if (item.answerType === 'checkpoint') {
    return (
      <CheckpointAnswer
        item={item}
        todos={todos}
        soloLectura={soloLectura}
        onGuardarTexto={onGuardarTextoDeCheckpoint}
        onResolver={onGuardarSelecciones}
      />
    );
  }

  if (item.answerType === 'criterios') {
    return (
      <CriteriosAnswer
        criterios={opcionesDisponibles(item, todos)}
        selecciones={item.selections}
        soloLectura={soloLectura}
        onGuardar={onGuardarSelecciones}
      />
    );
  }

  if (item.answerType === 'opciones_una' || item.answerType === 'opciones_multi') {
    return (
      <OpcionesAnswer
        opciones={opcionesDisponibles(item, todos)}
        selecciones={item.selections}
        unica={item.answerType === 'opciones_una'}
        soloLectura={soloLectura}
        onGuardar={onGuardarSelecciones}
      />
    );
  }

  /*
   * El soporte va DENTRO del campo, como marcador de posicion, y no en una
   * linea propia con su rotulo encima. Al desaparecer al teclear, el marcador
   * NO puede ser el unico nombre del campo: `aria-label` lo nombra.
   */
  return (
    <Textarea
      className="mt-1.5"
      rows={2}
      aria-label="Nota de este punto"
      value={nota}
      onChange={(e) => onCambiarNota(e.target.value)}
      onBlur={onGuardarNota}
      disabled={soloLectura}
      placeholder={item.support || 'Lo que dijo, en corto…'}
    />
  );
}
