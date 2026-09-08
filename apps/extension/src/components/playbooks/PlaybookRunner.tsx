import { useEffect, useMemo, useState } from 'react';
import { Button, Notice, Skeleton, EmptyState, Badge } from '../../design';
import { Icon } from '../../utils/icons';
import { usePlaybookRun } from '../../hooks/usePlaybookRun';
import { agruparPorFase } from '../../utils/playbookProgress';
import type { PlaybookRunItemState } from '../../types';
import PlaybookRunItemRow from './PlaybookRunItemRow';
import PlaybookRunCloseForm from './PlaybookRunCloseForm';

/**
 * EL CORREDOR: la pantalla que se usa durante la reunion.
 *
 * Se conduce mirando al cliente, no a la pantalla. De ahi casi todas sus
 * decisiones: los puntos van plegados para que los diecisiete quepan de un
 * vistazo y el avance esta siempre visible arriba.
 *
 * ## Responder ES avanzar
 *
 * Al marcar el punto abierto se abre el siguiente. Por eso no hay botones de
 * Anterior y Siguiente: para volver atras se toca esa pregunta.
 *
 * ## El orden orienta, la conversacion manda
 *
 * No se obliga a seguir la secuencia. Si el cliente contesta el punto 8
 * mientras hablabas del 2, se marca el 8 desde su propia fila y nada se mueve:
 * eso es marcar de pasada, y ahi un salto seria una sorpresa.
 */
interface Props {
  runId: string;
  onVolver: () => void;
}

export default function PlaybookRunner({ runId, onVolver }: Props) {
  const recorrido = usePlaybookRun(runId);
  const [abiertoId, setAbiertoId] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [anuncio, setAnuncio] = useState('');

  const fases = useMemo(() => agruparPorFase(recorrido.items), [recorrido.items]);
  const soloLectura = recorrido.run?.status !== 'en_curso';

  // Al entrar se abre el primer punto sin resolver: es donde quedo la
  // conversacion la vez anterior.
  useEffect(() => {
    if (abiertoId || recorrido.items.length === 0) return;
    const primero = recorrido.items.find((item) => item.state === 'pendiente');
    if (primero) setAbiertoId(primero.id);
  }, [recorrido.items, abiertoId]);

  const enfocar = (id: string) => {
    setAbiertoId(id);
    // El foco sigue al punto que se abre. Sin esto se queda en el boton que
    // acaba de desmontarse y se cae al <body>, que para quien navega con
    // teclado equivale a perder el sitio.
    requestAnimationFrame(() => {
      document.getElementById(`punto-${id}-disparador`)?.focus();
    });
  };

  /** Todos los puntos en el orden en que se recorren, atravesando las fases. */
  const enOrden = useMemo(() => fases.flatMap((fase) => fase.items), [fases]);

  /**
   * Responder avanza al siguiente punto. Por eso no hay Anterior/Siguiente:
   * responder ES avanzar, y para volver atras se toca esa pregunta.
   *
   * Solo avanza si el punto marcado ERA el que estaba abierto. Tocar el check
   * de una fila lejana es marcar de pasada -algo que el cliente ya contesto-,
   * y ahi mover el panel seria un salto que nadie pidio.
   */
  const marcar = async (itemId: string, state: PlaybookRunItemState) => {
    const item = recorrido.items.find((candidato) => candidato.id === itemId);
    const eraElAbierto = abiertoId === itemId;

    await recorrido.marcar(itemId, state);

    if (state === 'pendiente') {
      setAnuncio(`${item?.title ?? 'Punto'}, sin marcar.`);
      return;
    }

    setAnuncio(
      `${item?.title ?? 'Punto'}, marcado como ${state === 'hecho' ? 'hecho' : 'no aplica'}.`,
    );

    if (!eraElAbierto) return;

    const indice = enOrden.findIndex((candidato) => candidato.id === itemId);
    const siguiente = indice >= 0 ? enOrden[indice + 1] : undefined;
    if (siguiente) enfocar(siguiente.id);
    else setAbiertoId('');
  };

  if (recorrido.cargando && recorrido.items.length === 0) {
    return (
      <div role="status" aria-label="Cargando el guion" className="space-y-2 p-3">
        <Skeleton height="40px" />
        <Skeleton height="40px" />
        <Skeleton height="40px" />
      </div>
    );
  }

  if (!recorrido.run) {
    return (
      <EmptyState
        icon={Icon.Bullseye()}
        title="No encontramos este recorrido"
        description="Puede que se haya borrado el lead al que pertenecía."
        action={<Button onClick={onVolver}>Volver</Button>}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Una sola region viva para toda la pantalla: una por punto produciria
          una tormenta de anuncios al marcar varios seguidos. */}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {/* Guion y lead en una sola linea: cada pixel de alto de cabecera es un
          punto menos que cabe en la lista. */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <p className="min-w-0 truncate text-card-title font-semibold text-ink">
          {recorrido.run.playbookName ?? 'Guion'}
          <span className="ml-1.5 font-normal text-ink-muted">
            {recorrido.run.leadName ?? 'Lead'}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {soloLectura && (
            <Badge tone={recorrido.run.status === 'finalizado' ? 'success' : 'neutral'}>
              {recorrido.run.status === 'finalizado' ? 'Finalizado' : 'Abandonado'}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      {!!recorrido.error && <div className="px-3 pb-2"><Notice tone="danger">{recorrido.error}</Notice></div>}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {fases.map((fase) => (
          <section key={fase.position}>
            {/* El nombre de la fase vive AQUI y en ningun otro sitio: repetirlo
                dentro de cada punto costaba una linea por punto y no aportaba
                nada, porque la cabecera es pegajosa y siempre esta a la vista. */}
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-y border-line bg-surface-muted px-3 py-1.5">
              <span className="truncate text-meta font-semibold text-ink">{fase.title}</span>
              {/* tabular-nums para que los digitos no salten de ancho al pasar
                  de 8/17 a 17/17 en mitad de la llamada. */}
              <span className="shrink-0 text-meta tabular-nums text-ink-secondary">
                {fase.progreso.resueltos} de {fase.progreso.total}
                {fase.progreso.noAplica > 0 && ` · ${fase.progreso.noAplica} no aplica`}
              </span>
            </header>

            {/* Lista ORDENADA: el guion tiene orden, y anunciar "lista ordenada,
                17 elementos" es informacion real aqui. */}
            <ol aria-label={`Guion, ${fase.title}`} className="divide-y divide-line">
              {fase.items.map((item) => (
                <PlaybookRunItemRow
                  key={item.id}
                  item={item}
                  abierto={abiertoId === item.id}
                  guardando={recorrido.guardandoItemId === item.id}
                  soloLectura={soloLectura}
                  todos={recorrido.items}
                  onToggle={() => setAbiertoId(abiertoId === item.id ? '' : item.id)}
                  onMarcar={(state) => void marcar(item.id, state)}
                  onGuardarNota={(note) => void recorrido.guardarNotaDeItem(item.id, note)}
                  onGuardarSelecciones={(sel) => void recorrido.guardarSelecciones(item.id, sel)}
                  onGuardarTextoDeCheckpoint={(texto) =>
                    void recorrido.guardarTextoDeCheckpoint(item.id, texto)
                  }
                />
              ))}
            </ol>
          </section>
        ))}

        <div className="p-3">
          <PlaybookRunCloseForm
            soloLectura={soloLectura}
            cerrando={cerrando}
            notas={recorrido.notas}
            pendientes={recorrido.progreso.pendientes}
            onAgregarNota={(body) => void recorrido.agregarNota(body)}
            onCerrar={async (cierre) => {
              setCerrando(true);
              const ok = await recorrido.cerrar(cierre);
              setCerrando(false);
              return ok;
            }}
          />
        </div>
      </div>
    </div>
  );
}
