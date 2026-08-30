import { useState } from 'react';
import { Button, Input, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import { nombreVisible } from '../../utils/leadDisplay';
import { STATUS_LABELS, type Lead, type LeadStatus } from '../../types';

/** Los atajos de fecha, en dias desde hoy. */
const ATAJOS: Array<{ etiqueta: string; dias: number }> = [
  { etiqueta: 'Mañana', dias: 1 },
  { etiqueta: 'En 3 días', dias: 3 },
  { etiqueta: 'En una semana', dias: 7 },
];

/** Hora que se asume en los atajos. */
const HORA_POR_DEFECTO = '09:00';

/** `aaaa-mm-dd` en hora local, que es lo que espera un `input[type=date]`. */
function aFechaLocal(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * EL LEAD SE MOVIO: ¿LE AGENDAMOS EL SEGUIMIENTO?
 *
 * ## Por que es un modal
 *
 * Vivia empotrado arriba de la pantalla, y eso costaba dos cosas a la vez:
 * empujaba el tablero -que es a lo que veniste- fuera de la vista, y dejaba la
 * pagina con dos alturas distintas segun si acababas de mover algo o no. Un
 * bloque que aparece y desaparece encima del contenido hace que todo salte.
 *
 * Como modal no mueve nada de lo que hay detras, y se cierra con Escape, con la
 * X o tocando afuera. Va anclado arriba para que no salte de sitio.
 *
 * ## El titulo es la confirmacion
 *
 * Antes habia dos textos que decian casi lo mismo: el titulo del panel
 * ("Seguimiento de Betzabeth") y, en una linea aparte debajo, el aviso del
 * movimiento ("Betzabeth pasó a Contactado") con su boton de deshacer. Y el
 * nombre volvia a aparecer una tercera vez dentro del campo de texto.
 *
 * Ahora el titulo ES la confirmacion del movimiento, y deshacer vive a su
 * derecha. El campo ya dice de quien es la tarea, asi que no hace falta
 * repetirlo arriba.
 */
export function TaskFollowUpPrompt({
  lead,
  nuevoEstado,
  onCrear,
  onDeshacer,
  onOmitir,
}: {
  lead: Lead;
  nuevoEstado: LeadStatus;
  onCrear: (datos: { titulo: string; fecha: string; hora: string }) => void;
  /** Devuelve el lead a su etapa anterior y cierra. */
  onDeshacer: () => void;
  onOmitir: () => void;
}) {
  const [titulo, setTitulo] = useState(`Seguimiento para ${nombreVisible(lead.name)}`);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(HORA_POR_DEFECTO);
  const [fechaALaCarta, setFechaALaCarta] = useState(false);

  const limpio = titulo.trim();
  const elegido = ATAJOS.find((atajo) => aFechaLocal(atajo.dias) === fecha);

  return (
    <Modal onClose={onOmitir} maxWidth="360px" label="Agendar seguimiento" align="top">
      <div className="flex flex-col">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2.5">
          <p className="min-w-0 flex-1 truncate text-meta font-semibold text-ink">
            {nombreVisible(lead.name)} pasó a {STATUS_LABELS[nuevoEstado]}
          </p>

          <button
            type="button"
            onClick={onDeshacer}
            title="Deshacer el movimiento"
            aria-label="Deshacer el movimiento"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-3 [&_svg]:w-3"
          >
            <Icon.Restore />
          </button>

          <button
            type="button"
            onClick={onOmitir}
            title="Ahora no"
            aria-label="Ahora no"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-3 [&_svg]:w-3"
          >
            <Icon.Close />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-3 py-3">
          <Input
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Título de la tarea"
            aria-label="Título de la tarea"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {ATAJOS.map((atajo) => {
              const activo = elegido?.dias === atajo.dias && !fechaALaCarta;
              return (
                <button
                  key={atajo.dias}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setFecha(aFechaLocal(atajo.dias));
                    setHora(HORA_POR_DEFECTO);
                    setFechaALaCarta(false);
                  }}
                  className={`h-control-sm rounded-md px-2.5 text-micro font-medium transition-colors ${
                    activo
                      ? 'bg-primary text-ink-inverse'
                      : 'border border-line bg-surface text-ink-secondary hover:text-ink'
                  }`}
                >
                  {atajo.etiqueta}
                </button>
              );
            })}

            <button
              type="button"
              aria-pressed={fechaALaCarta}
              onClick={() => setFechaALaCarta((estaba) => !estaba)}
              className={`h-control-sm rounded-md px-2.5 text-micro font-medium transition-colors ${
                fechaALaCarta
                  ? 'bg-primary text-ink-inverse'
                  : 'border border-line bg-surface text-ink-secondary hover:text-ink'
              }`}
            >
              Otra fecha
            </button>
          </div>

          {fechaALaCarta && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                aria-label="Fecha del seguimiento"
              />
              <Input
                type="time"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
                aria-label="Hora del seguimiento"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
          {/*
            Sin fecha la tarea se crea igual, sin vencimiento, y se dice. Antes
            eso pasaba EN SILENCIO cuando ponias fecha y te olvidabas la hora.
          */}
          <span className="min-w-0 flex-1 truncate text-micro text-ink-secondary">
            {fecha ? 'Queda agendada' : 'Sin fecha'}
          </span>
          <Button
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              if (!limpio) return;
              onCrear({ titulo: limpio, fecha, hora });
            }}
          >
            {limpio ? 'Crear tarea' : 'Ponele un título'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
