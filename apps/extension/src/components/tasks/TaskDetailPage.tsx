import { useEffect, useRef, useState } from 'react';
import type { Lead, LeadList, Task, TaskSection } from '../../types';
import { Button, IconButton, Input, Select, Textarea } from '../../design';
import { TaskNotesBar } from './TaskNotesBar';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';
import { esUrgente, explicarUrgencia } from '../../utils/taskPriority';
import { COLORES_DE_TAREA } from '../../utils/listColors';
import { useTaskSubtasks } from '../../hooks/useTaskSubtasks';
import { useTaskExtras } from '../../hooks/useTaskExtras';

/** Un archivo mas grande que esto lo rechaza el bucket. Se avisa antes. */
const MAX_BYTES = 5 * 1024 * 1024;

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * EL DETALLE DE UNA TAREA, A PANTALLA COMPLETA
 *
 * ## Por que volvio a ser una pantalla y no un panel debajo del tablero
 *
 * El panel inferior tenia un problema de fondo: el tablero de arriba crece con
 * las tareas que tenga la columna mas larga, asi que con treinta tareas el
 * detalle quedaba empujado fuera de la vista y el reparto de alto dejaba de
 * existir. Un panel que solo funciona con pocas tareas no es un panel.
 *
 * Como pantalla, el detalle tiene todo el alto y la flecha devuelve exactamente
 * a la vista de donde saliste.
 *
 * ## El orden
 *
 * Cabecera, metadatos, descripcion, pasos, adjuntos, notas. Es de arriba abajo
 * lo mas fijo a lo que mas crece: lo que se consulta de un vistazo primero, y lo
 * que se acumula con el tiempo al final.
 *
 * ## Que se fue de la vista
 *
 * El color y las acciones destructivas viven en el menu de configuracion. El
 * color es una preferencia que se toca una vez; tenerlo permanente costaba una
 * fila entera de seis circulos al lado de datos que si se consultan.
 */
export function TaskDetailPage({
  task,
  sections,
  leads,
  lists,
  userId,
  onVolver,
  onGuardar,
  onToggleComplete,
  onEliminar,
}: {
  task: Task;
  sections: TaskSection[];
  leads: Lead[];
  lists: LeadList[];
  userId: string | undefined;
  onVolver: () => void;
  onGuardar: (cambios: Partial<Task>) => void;
  onToggleComplete: () => void;
  onEliminar: () => void;
}) {
  const [titulo, setTitulo] = useState(task.titulo);
  const [descripcion, setDescripcion] = useState(task.descripcion);
  const [nuevoPaso, setNuevoPaso] = useState('');
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [avisoDeArchivo, setAvisoDeArchivo] = useState('');

  const archivoRef = useRef<HTMLInputElement>(null);
  const fechaRef = useRef<HTMLInputElement>(null);
  const pasos = useTaskSubtasks(task.id ?? null);
  const extras = useTaskExtras(task.id ?? null, userId);

  useEffect(() => {
    setTitulo(task.titulo);
    setDescripcion(task.descripcion);
  }, [task.id, task.titulo, task.descripcion]);

  const vinculados = [
    ...task.leadIds.map((id) => leads.find((l) => l.id === id)?.name).filter(Boolean),
    ...task.leadListIds.map((id) => lists.find((l) => l.id === id)?.name).filter(Boolean),
  ];

  const elegirArchivo = (archivo: File | undefined) => {
    if (!archivo) return;
    setAvisoDeArchivo('');

    /*
     * Se comprueba el tamaño ANTES de subir. Sin esto el archivo viaja entero
     * para que el bucket lo rechace al final, y el usuario espera la subida
     * completa para recibir un error que se sabia de antemano.
     */
    if (archivo.size > MAX_BYTES) {
      setAvisoDeArchivo(`${archivo.name} pesa ${pesoLegible(archivo.size)}. El tope son 5 MB.`);
      return;
    }
    void extras.adjuntar(archivo);
  };

  return (
    /* `pb-16`: la barra de notas es `fixed`, o sea que sale del flujo y no
       empuja nada. Sin esta reserva taparia el final de los adjuntos de forma
       permanente, no solo al scrollear. */
    <div className="flex flex-col gap-3 pb-16">
      {/*
        Navegacion a la izquierda, acciones a la derecha, como hace `PageShell`.
        Antes todo el peso estaba a la izquierda y la derecha quedaba vacia.

        "Finalizar" pasa a PRIMARIA: es lo que la pantalla existe para hacer, y
        estaba con el mismo peso que "Adjuntar". Y se acorta: "Marcar como
        finalizada" pide unos 110px de los 336.
      */}
      <div className="flex items-center gap-1">
        <IconButton icon={<Icon.ArrowLeft />} label="Volver" size="sm" onClick={onVolver} />
        <span className="min-w-0 flex-1" />
        <IconButton
          icon={<Icon.More />}
          label="Configuración de la tarea"
          size="sm"
          onClick={() => setAjustesAbiertos((estaba) => !estaba)}
          aria-expanded={ajustesAbiertos}
        />
        <Button
          size="sm"
          variant={task.status === 'completada' ? 'secondary' : 'primary'}
          onClick={onToggleComplete}
          className="shrink-0"
        >
          {task.status === 'completada' ? 'Reabrir' : 'Finalizar'}
        </Button>
      </div>

      {/*
        El menu de configuracion. Se despliega EN EL FLUJO y no flotando: un
        panel flotante en un contenedor angosto se sale por el borde, que es el
        fallo que ya hubo que arreglar en el editor de plantillas.
      */}
      {ajustesAbiertos && (
        <div className="flex flex-col gap-1.5 rounded-md border border-line bg-surface-sunken p-2">
          <div className="flex items-center gap-1.5">
            {/* El rotulo deja de reservar 86px: son cinco letras al lado de
                siete circulos, no una columna de formulario. */}
            <span className="shrink-0 text-micro text-ink-secondary">Color</span>
            <button
              type="button"
              onClick={() => onGuardar({ color: null })}
              title="Sin color"
              aria-label="Sin color"
              className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] leading-none text-ink-secondary ${
                task.color === null ? 'border-primary ring-1 ring-focus' : 'border-line'
              }`}
            >
              —
            </button>
            {COLORES_DE_TAREA.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onGuardar({ color: hex })}
                aria-label={`Pintar de ${hex}`}
                className={`h-4 w-4 rounded-full border ${
                  task.color === hex ? 'border-primary ring-1 ring-focus' : 'border-line-soft'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onEliminar}
            className="flex min-h-[28px] items-center gap-2 rounded-md px-1 text-left text-micro text-state-danger transition-colors hover:bg-state-danger-soft"
          >
            <span className="[&_svg]:h-3 [&_svg]:w-3">{Icon.Trash()}</span>
            Eliminar la tarea
          </button>
        </div>
      )}

      {/* Titulo */}
      <Input
        value={titulo}
        onChange={(evento) => setTitulo(evento.target.value)}
        onBlur={() => {
          const limpio = titulo.trim();
          if (limpio && limpio !== task.titulo) onGuardar({ titulo: limpio });
          else setTitulo(task.titulo);
        }}
        aria-label="Título de la tarea"
        className="h-control-lg text-section-title font-semibold"
      />

      {/*
        LA FICHA. Antes eran cinco filas de `rotulo (86px) | control`, unos
        190px. El rotulo se comia el 26% del ancho para decir cinco palabras, y
        "Vence" -que se edita- pesaba lo mismo que "Urgencia", que es una frase
        derivada que no se toca.

        Ahora son chips: dicen su valor y se tocan para cambiarlo. Baja a 86px.
      */}
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2.5 shadow-card">
        <div className="flex flex-wrap items-center gap-1.5">
          {/*
            La fecha abre el calendario NATIVO. No se dibuja uno propio a
            proposito: el del navegador se pinta fuera del arbol del documento,
            asi que ningun `overflow` puede recortarlo -que es justo el fallo que
            hubo que arreglar en el editor de plantillas- y ya trae teclado.
            El input queda en el DOM con tamaño cero: si `showPicker` no
            existiera, el foco cae en el y sigue sirviendo.
          */}
          <button
            type="button"
            onClick={() => {
              const campo = fechaRef.current;
              if (!campo) return;
              if (typeof campo.showPicker === 'function') campo.showPicker();
              else campo.focus();
            }}
            title={explicarUrgencia(task.fechaVencimiento)}
            aria-label={`Vence: ${task.fechaVencimiento ? formatearFecha(task.fechaVencimiento) : 'sin fecha'}. ${explicarUrgencia(task.fechaVencimiento)}`}
            className="flex h-control-sm items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 text-meta text-ink transition-colors hover:bg-surface-hover"
          >
            <span className="text-ink-secondary [&_svg]:h-2.5 [&_svg]:w-2.5">{Icon.Calendar()}</span>
            {task.fechaVencimiento ? formatearFecha(task.fechaVencimiento) : 'Sin fecha'}
          </button>

          <input
            ref={fechaRef}
            type="date"
            value={task.fechaVencimiento ? task.fechaVencimiento.slice(0, 10) : ''}
            onChange={(evento) =>
              onGuardar({
                fechaVencimiento: evento.target.value
                  ? new Date(`${evento.target.value}T23:59:59`).toISOString()
                  : '',
              })
            }
            aria-hidden="true"
            tabIndex={-1}
            className="h-0 w-0 border-0 p-0"
          />

          {/*
            "Urgente" solo se dibuja cuando lo es. Lo contrario se dice con
            ausencia y no con un gris apagado, que seria la trampa de la
            opacidad por otra via. La regla completa vive en el `title` del
            chip de fecha, asi que no se pierde.
          */}
          {esUrgente(task) && (
            <span className="flex h-control-sm items-center rounded-full bg-state-danger-soft px-2.5 text-meta font-semibold text-state-danger">
              Urgente
            </span>
          )}

          <button
            type="button"
            onClick={() => onGuardar({ importante: !task.importante })}
            aria-pressed={task.importante}
            title="Importante: me acerca a un objetivo"
            className={`flex h-control-sm items-center rounded-full px-2.5 text-meta transition-colors ${
              task.importante
                ? 'bg-primary-soft font-semibold text-primary-ink'
                : 'bg-surface-sunken text-ink-secondary hover:text-ink'
            }`}
          >
            Importante
          </button>
        </div>

        {/*
          Seccion y "vinculado a" comparten renglon: las dos contestan lo mismo,
          donde vive esto. El `select` mide lo que mide su valor y no el ancho
          entero; sigue siendo nativo porque su menu lo pinta el sistema fuera
          del documento y no hay `overflow` que pueda recortarlo.
        */}
        <div className="flex items-center gap-2">
          <Select
            value={task.sectionId ?? ''}
            onChange={(evento) => onGuardar({ sectionId: evento.target.value || null })}
            compact
            fullWidth={false}
            aria-label="Sección de la tarea"
            className="h-control-sm max-w-[150px] shrink-0 text-meta"
          >
            <option value="">Sin sección</option>
            {sections.map((seccion) => (
              <option key={seccion.id} value={seccion.id}>
                {seccion.name}
              </option>
            ))}
          </Select>

          {vinculados.length > 0 && (
            <span className="min-w-0 flex-1 truncate text-meta text-ink-secondary">
              {vinculados.join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Descripcion */}
      <section>
        {/* Sin versalita: 10px en mayusculas con tracking es el peor caso de
            legibilidad de la escala -las mayusculas no tienen ascendentes ni
            descendentes, asi que se pierde la silueta de la palabra-. */}
        <p className="mb-1 text-meta font-semibold text-ink-secondary">Descripción</p>
        <Textarea
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          onBlur={() => {
            if (descripcion !== task.descripcion) onGuardar({ descripcion });
          }}
          placeholder="Criterios, contexto, lo que haga falta…"
          aria-label="Descripción"
          rows={3}
        />
      </section>

      {/* Pasos */}
      <section>
        <p className="mb-1 text-meta font-semibold text-ink-secondary">
          Pasos{' '}
          <span className="tabular-nums text-ink-muted">
            {pasos.hechas}/{pasos.subtasks.length}
          </span>
        </p>

        <div className="flex flex-col gap-1">
          {pasos.subtasks.map((paso) => (
            <div key={paso.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paso.hecha}
                onChange={() => void pasos.alternar(paso)}
                aria-label={`Marcar ${paso.titulo}`}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
              />
              {/* Tachado, no atenuado: un paso hecho tiene que seguir leyendose. */}
              <span
                className={`min-w-0 flex-1 truncate text-meta ${
                  paso.hecha ? 'text-ink-muted line-through' : 'text-ink'
                }`}
              >
                {paso.titulo}
              </span>
              <button
                type="button"
                onClick={() => void pasos.borrar(paso.id)}
                aria-label={`Quitar ${paso.titulo}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger [&_svg]:h-2.5 [&_svg]:w-2.5"
              >
                {Icon.Trash()}
              </button>
            </div>
          ))}

          <Input
            value={nuevoPaso}
            onChange={(evento) => setNuevoPaso(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key !== 'Enter' || !nuevoPaso.trim()) return;
              void pasos.agregar(nuevoPaso.trim());
              setNuevoPaso('');
            }}
            placeholder="Agregar un paso y Enter"
            aria-label="Nuevo paso"
          />
        </div>
      </section>

      {/* Adjuntos */}
      <section>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-meta font-semibold text-ink-secondary">
            Adjuntos{' '}
            <span className="tabular-nums text-ink-muted">{extras.attachments.length}</span>
          </p>
          {/* Icono y no un boton con la palabra "Adjuntar" al lado del rotulo
              "Adjuntos": esa redundancia costaba unos 60px de los 336. */}
          <IconButton
            icon={<Icon.Paperclip />}
            label={extras.subiendo ? 'Subiendo el archivo' : 'Adjuntar un archivo'}
            size="sm"
            disabled={extras.subiendo}
            onClick={() => archivoRef.current?.click()}
          />
        </div>

        <input
          ref={archivoRef}
          type="file"
          className="hidden"
          onChange={(evento) => {
            elegirArchivo(evento.target.files?.[0]);
            // Se limpia para poder volver a elegir el MISMO archivo: sin esto el
            // `change` no dispara la segunda vez.
            evento.target.value = '';
          }}
        />

        {(avisoDeArchivo || extras.error) && (
          <p role="alert" className="mb-1 text-micro text-state-danger">
            {avisoDeArchivo || extras.error}
          </p>
        )}

        {extras.attachments.length === 0 ? (
          <p className="text-micro text-ink-secondary">Todavía no hay archivos.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {extras.attachments.map((adjunto) => (
              <div
                key={adjunto.id}
                className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5"
              >
                {adjunto.mime.startsWith('image/') && adjunto.url ? (
                  <img
                    src={adjunto.url}
                    alt={adjunto.nombre}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="shrink-0 text-ink-muted [&_svg]:h-3.5 [&_svg]:w-3.5">
                    {Icon.Paperclip()}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta text-ink">{adjunto.nombre}</span>
                  <span className="block text-micro text-ink-secondary">
                    {pesoLegible(adjunto.bytes)}
                  </span>
                </span>

                {adjunto.url && (
                  <a
                    href={adjunto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir ${adjunto.nombre}`}
                    aria-label={`Abrir ${adjunto.nombre}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
                  >
                    {Icon.View()}
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => void extras.borrarAdjunto(adjunto)}
                  aria-label={`Quitar ${adjunto.nombre}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger [&_svg]:h-2.5 [&_svg]:w-2.5"
                >
                  {Icon.Trash()}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/*
        Las notas salieron del cuerpo y viven en la barra del pie. Es un cambio
        de sitio, no solo de forma: si scrolleas hasta el fondo de la tarea ya no
        las vas a encontrar ahi. Se defiende porque una nota es un registro
        cronologico -como un chat- y no un campo del formulario, y porque el
        contador siempre visible en la barra recuerda mas que una seccion que
        habia que ir a buscar.
      */}
      <TaskNotesBar
        notes={extras.notes}
        onAgregar={(cuerpo) => void extras.agregarNota(cuerpo)}
        onBorrar={(id) => void extras.borrarNota(id)}
      />
    </div>
  );
}
