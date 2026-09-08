import { useState } from 'react';
import { Button, IconButton, Input, Textarea, Checkbox, Panel, Hint } from '../../design';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';
import type { PlaybookRunNote } from '../../types';
import type { CierreDeRecorrido } from '../../services/playbookRunService';

/**
 * Anotaciones del recorrido y su cierre.
 *
 * ## Que es una anotacion y por que no se entendia
 *
 * Es lo que pasa ENTRE reuniones: "le mande la comparacion", "no contesto el
 * viernes". No es la nota de un punto del guion -esa vive en el punto- sino
 * del proceso entero, y por eso lleva fecha.
 *
 * Estaba como un boton "Agregar anotacion" apagado debajo de un cuadro vacio:
 * ni decia para que servia ni por que estaba apagado. Ahora es la misma fila de
 * escribir-y-enviar que el historial de interacciones de la ficha del lead, con
 * el avion de papel al lado. Se activa al escribir, que es lo unico que hay que
 * entender.
 *
 * ## El cierre no se ve hasta que se pide
 *
 * Finalizar y Abandonar son dos botones pequeños en una fila. El formulario
 * -nota, casilla, confirmacion- solo aparece al elegir uno: durante la reunion
 * ese bloque es peso muerto en una pantalla que se navega con el pulgar.
 */
interface Props {
  soloLectura: boolean;
  cerrando: boolean;
  notas: PlaybookRunNote[];
  pendientes: number;
  onAgregarNota: (body: string) => void;
  onCerrar: (cierre: Omit<CierreDeRecorrido, 'runId'>) => Promise<boolean>;
}

export default function PlaybookRunCloseForm({
  soloLectura,
  cerrando,
  notas,
  pendientes,
  onAgregarNota,
  onCerrar,
}: Props) {
  const [nota, setNota] = useState('');
  const [cierre, setCierre] = useState('');
  const [alLead, setAlLead] = useState(true);
  const [modo, setModo] = useState<'' | 'finalizado' | 'abandonado'>('');

  const enviarNota = () => {
    if (!nota.trim()) return;
    onAgregarNota(nota);
    setNota('');
  };

  return (
    <div className="space-y-2">
      <p className="text-micro font-bold uppercase tracking-widest text-ink-muted">
        Qué pasó entre reuniones
      </p>

      {notas.length > 0 && (
        <ul className="space-y-1">
          {notas.map((entrada) => (
            <li key={entrada.id} className="rounded border border-line bg-surface px-2 py-1.5">
              <p className="text-micro text-ink-muted">
                {entrada.kind === 'cierre' && <span className="font-semibold">Cierre · </span>}
                {formatearFecha(entrada.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-body text-ink">{entrada.body}</p>
            </li>
          ))}
        </ul>
      )}

      {!soloLectura && (
        <div className="flex items-center gap-1.5">
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') enviarNota();
            }}
            placeholder="Le mandé la propuesta, quedó en revisarla…"
          />
          <IconButton
            icon={Icon.Send()}
            label="Guardar la anotación"
            size="sm"
            disabled={!nota.trim()}
            onClick={enviarNota}
          />
        </div>
      )}

      {!soloLectura &&
        (!modo ? (
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setModo('abandonado')}>
              Abandonar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setModo('finalizado')}>
              Finalizar guion
            </Button>
          </div>
        ) : (
          <div className="space-y-2 border-t border-line pt-2">
            <Panel tone={modo === 'finalizado' ? 'info' : 'warning'}>
              <p className="text-micro font-medium">
                {modo === 'finalizado'
                  ? 'Finalizar no significa que haya contratado: quedarse con su plan actual también es una asesoría terminada.'
                  : 'Abandonar corta el proceso. Después podrás empezar este guion de cero con este lead.'}
              </p>
            </Panel>

            {pendientes > 0 && (
              <Hint>
                {`Quedan ${pendientes} ${pendientes === 1 ? 'punto' : 'puntos'} sin responder. Se conservan tal como están.`}
              </Hint>
            )}

            <Textarea
              rows={2}
              aria-label={modo === 'finalizado' ? 'Nota de cierre' : 'Por qué se abandona'}
              value={cierre}
              onChange={(e) => setCierre(e.target.value)}
              placeholder={
                modo === 'finalizado'
                  ? 'Cómo terminó la asesoría…'
                  : 'Perdimos contacto, no califica, cambio de estrategia…'
              }
            />

            <Checkbox
              checked={alLead && !!cierre.trim()}
              disabled={!cierre.trim()}
              onChange={(e) => setAlLead(e.target.checked)}
              label="Dejarla también en la ficha del lead"
            />

            <div className="flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" disabled={cerrando} onClick={() => setModo('')}>
                Cancelar
              </Button>
              <Button
                variant={modo === 'finalizado' ? 'primary' : 'danger'}
                size="sm"
                disabled={cerrando}
                onClick={() => {
                  void onCerrar({
                    status: modo,
                    nota: cierre,
                    tambienComoNotaDelLead: alLead,
                  });
                }}
              >
                {cerrando ? 'Guardando…' : modo === 'finalizado' ? 'Finalizar' : 'Abandonar'}
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
