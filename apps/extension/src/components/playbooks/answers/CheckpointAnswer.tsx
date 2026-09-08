import { useEffect, useState } from 'react';
import { Textarea, ToggleIconButton } from '../../../design';
import { deducirBuckets } from '../../../utils/playbookBuckets';
import { componerConfirmacion } from '../../../utils/playbookCheckpointText';
import { resolverEntrada } from '../../../utils/playbookAnswers';
import type { Resolucion } from '../../../utils/playbookBuckets';
import { resolucionesDe } from '../../../utils/playbookAnswers';
import { Icon } from '../../../utils/icons';
import { RespuestaFila } from './RespuestaFila';
import { GrupoDeRadios } from './GrupoDeRadios';

/** Las dos salidas de un desempate, en el mismo lenguaje que la clasificacion. */
const SALIDAS: { valor: Resolucion; rotulo: string; icono: () => React.ReactNode; tono: 'success' | 'danger' }[] = [
  { valor: 'mejorar', rotulo: 'Mejorarlo', icono: Icon.Check, tono: 'success' },
  { valor: 'prescindible', rotulo: 'No es indispensable', icono: Icon.Ban, tono: 'danger' },
];
import type { PlaybookRunItem, PlaybookSelection } from '../../../types';

/**
 * El checkpoint: la frase que se le lee al cliente para confirmar.
 *
 * ## Como se evita el bucle "editar → re-derivar → pisar lo editado"
 *
 * Con `checkpointText` a `undefined`, la frase se DERIVA en cada render y sigue
 * a lo que se vaya marcando arriba. En cuanto la persona escribe, deja de
 * derivarse y manda lo escrito. No hay efecto que sincronice nada, asi que no
 * existe la ventana por la que un recalculo podria pisar el texto.
 *
 * Y cadena vacia NO es lo mismo que `undefined`: significa "la borre a
 * proposito". Por eso esto no vive en la columna `note`, donde las dos serian
 * indistinguibles y la frase quedaria indeleble.
 *
 * ## Una contradiccion se PREGUNTA antes de redactar
 *
 * Si el cliente marco algo para mejorar y ademas lo declaro prescindible, la
 * frase no se genera todavia: se le pregunta cual pesa mas, con dos opciones, y
 * solo con eso contestado aparece la confirmacion.
 *
 * Antes esto solo avisaba y redactaba igual, con el argumento de que dejar sin
 * frase en mitad de la reunion es peor. Ese argumento valia cuando no habia
 * nada que hacer al respecto; con un desempate de un toque, deja de valer.
 *
 * La respuesta se guarda en las `selections` DEL CHECKPOINT y no corrige el
 * origen: que dijo las dos cosas es un dato que no se borra.
 */
interface Props {
  item: PlaybookRunItem;
  todos: readonly PlaybookRunItem[];
  soloLectura: boolean;
  onGuardarTexto: (texto: string | null) => void;
  onResolver: (selecciones: PlaybookSelection[]) => void;
}

export default function CheckpointAnswer({
  item,
  todos,
  soloLectura,
  onGuardarTexto,
  onResolver,
}: Props) {
  const entrada = resolverEntrada(item, todos);
  const deduccion = entrada ? deducirBuckets(entrada) : null;
  const derivada = deduccion ? componerConfirmacion(deduccion) : null;

  const guardadaAMano = item.checkpointText !== undefined;
  const [borrador, setBorrador] = useState(item.checkpointText ?? '');
  /*
   * `tocado` cubre el hueco entre la primera tecla y el guardado: sin el, al no
   * haber texto guardado todavia el campo seguiria pintando la frase derivada y
   * escribir no se veria.
   */
  const [tocado, setTocado] = useState(false);

  // Solo se re-sincroniza cuando cambia el texto GUARDADO, no en cada render:
  // mientras se escribe, el borrador local manda.
  useEffect(() => {
    setBorrador(item.checkpointText ?? '');
    setTocado(false);
  }, [item.id, item.checkpointText]);

  const editada = guardadaAMano || tocado;
  const texto = editada ? borrador : (derivada?.texto ?? '');

  const pendientes = deduccion?.contradicciones ?? [];

  const resolver = (opcionId: string, resolucion: Resolucion) =>
    onResolver([
      ...item.selections.filter((s) => s.id !== opcionId),
      { id: opcionId, value: resolucion },
    ]);

  if (pendientes.length > 0 && !soloLectura) {
    const resueltas = resolucionesDe(item);

    return (
      <div className="mt-1.5 space-y-1.5">
        <p className="text-micro text-ink-secondary">
          Me dijiste dos cosas que se contradicen. Antes de armar el resumen, ¿qué pesa más?
        </p>

        <ul>
          {pendientes.map((opcion) => (
            <RespuestaFila key={opcion.id} etiqueta={opcion.label}>
              <GrupoDeRadios label={`Qué pesa más: "${opcion.label}"`}>
                {SALIDAS.map((salida, indice) => {
                  const activo = resueltas.get(opcion.id) === salida.valor;

                  return (
                    <ToggleIconButton
                      key={salida.valor}
                      active={activo}
                      tono={salida.tono}
                      icon={salida.icono()}
                      role="radio"
                      aria-checked={activo}
                      aria-label={salida.rotulo}
                      title={salida.rotulo}
                      tabIndex={indice === 0 ? 0 : -1}
                      onClick={() => resolver(opcion.id, salida.valor)}
                    />
                  );
                })}
              </GrupoDeRadios>
            </RespuestaFila>
          ))}
        </ul>
      </div>
    );
  }

  if (!derivada || (!derivada.texto && !editada)) {
    // Sin caja: los otros dos cuerpos resuelven su estado vacio con un
    // parrafo suelto, y este era el unico que lo envolvia en un Panel.
    return (
      <p className="mt-1.5 text-micro text-ink-muted">
        Todavía falta responder los puntos anteriores para armar el resumen.
      </p>
    );
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      {!!deduccion?.huerfanas.length && (
        <p className="text-micro text-ink-muted">
          {`${deduccion.huerfanas.length} ${deduccion.huerfanas.length === 1 ? 'criterio clasificado ya no está marcado' : 'criterios clasificados ya no están marcados'} en los puntos anteriores, así que no cuentan.`}
        </p>
      )}

      {/* Dos filas, como el resto de cuerpos. `CONTROL` ya trae `resize-y`, asi
          que una frase larga se agranda a mano; reservar tres por si acaso es
          alto muerto en la mayoria de los casos. */}
      <Textarea
        rows={2}
        aria-label="Confirmación del diagnóstico, editable"
        value={texto}
        disabled={soloLectura}
        onChange={(e) => {
          setTocado(true);
          setBorrador(e.target.value);
        }}
        onBlur={() => {
          if (borrador === (item.checkpointText ?? '')) return;
          onGuardarTexto(borrador);
        }}
      />

      {guardadaAMano && !soloLectura && (
        <button
          type="button"
          onClick={() => onGuardarTexto(null)}
          className="text-micro font-medium text-primary hover:underline"
        >
          Volver a la frase automática
        </button>
      )}

      {!!derivada.omitidos && !editada && (
        <p className="text-micro text-ink-muted">
          {`Se omitieron ${derivada.omitidos} para que la frase se pueda leer en voz alta. Están en el detalle.`}
        </p>
      )}
    </div>
  );
}
