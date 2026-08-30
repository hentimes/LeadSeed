import { useState, useEffect, useMemo } from 'react';
import type { Task, Lead, LeadList } from '../../types';
import { Button, Input, Modal, Textarea } from '../../design';
import { Icon } from '../../utils/icons';
import SinNombreToggle, { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';
import { nombreVisible } from '../../utils/leadDisplay';
import { explicarUrgencia } from '../../utils/taskPriority';
import { COLORES_DE_TAREA, nombreDeColor } from '../../utils/listColors';

interface TaskFormProps {
  task: Task | null;
  leads: Lead[];
  lists: LeadList[];
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
  /**
   * Como se monta.
   *
   * `modal` para crear: es un formulario corto y no vale la pena cambiar de
   * pantalla por el. `pagina` para abrir una tarea que ya existe, donde el
   * detalle ES la pantalla y se vuelve con la flecha.
   *
   * Es el mismo componente en los dos casos a proposito: con dos, los campos
   * estarian escritos dos veces y se separarian en cuanto se agregue uno.
   */
  modo?: 'modal' | 'pagina';
  /** Solo en modo pagina: marcar la tarea como hecha sin salir. */
  onToggleComplete?: (task: Task) => void;
}

/**
 * CREAR O EDITAR UNA TAREA
 *
 * ## Por que es un modal
 *
 * Se pintaba empotrado ARRIBA de la lista, empujandola entera hacia abajo: al
 * tocar el lapiz de una tarea, esa tarea se iba de la pantalla y el formulario
 * aparecia donde antes estaba otra cosa. Y medía casi 600px, con la lista de
 * leads como una caja con scroll propio, sin buscador y sin forma de ocultar
 * los que no tienen nombre.
 *
 * Como modal no mueve nada de lo que hay detras y se cierra con Escape.
 *
 * ## Los leads, plegados
 *
 * La caja de casillas ocupaba 128px permanentes para algo que la mayoria de las
 * tareas no usa. Ahora es una fila que dice a quienes elegiste y se despliega
 * al tocarla, con su buscador y el interruptor de "sin nombre" -que faltaba, y
 * con mil leads sin nombre esa lista era inservible-.
 *
 * Se despliega EN EL FLUJO y no flotando: un panel flotante dentro de un modal
 * es el fallo que ya hubo que arreglar en el editor de plantillas, donde se
 * salia por el borde.
 *
 * ## La urgencia no se marca
 *
 * Solo se marca la importancia. La urgencia sale de la fecha, y hasta ahora eso
 * era invisible: marcabas "es importante" y la otra mitad de la matriz se
 * decidia sola sin que nada dijera con que regla. La linea bajo el campo de
 * fecha lo dice mientras elegis.
 */
export default function TaskForm({ task, leads, lists, onSave, onCancel, modo = 'modal', onToggleComplete }: TaskFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [leadListIds, setLeadListIds] = useState<number[]>([]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [importante, setImportante] = useState(false);
  const [color, setColor] = useState<string | null>(null);

  const [leadsAbiertos, setLeadsAbiertos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [ocultarSinNombre, setOcultarSinNombre] = useState(false);

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo);
      setDescripcion(task.descripcion);
      setLeadIds(task.leadIds || []);
      setLeadListIds(task.leadListIds || []);
      setFechaVencimiento(task.fechaVencimiento ? task.fechaVencimiento.slice(0, 10) : '');
      setImportante(task.importante);
      setColor(task.color);
    } else {
      setTitulo('');
      setDescripcion('');
      setLeadIds([]);
      setLeadListIds([]);
      setFechaVencimiento('');
      setImportante(false);
      setColor(null);
    }
  }, [task]);

  const activos = useMemo(() => leads.filter((lead) => !lead.deletedAt), [leads]);
  const sinNombreTotal = useMemo(() => contarSinNombre(activos), [activos]);

  const visibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    return activos.filter((lead) => {
      if (!pasaFiltroDeNombre(lead, ocultarSinNombre)) return false;
      if (!texto) return true;
      return lead.name.toLowerCase().includes(texto) || (lead.phone || '').includes(texto);
    });
  }, [activos, busqueda, ocultarSinNombre]);

  const limpio = titulo.trim();

  const elegidos = leadIds
    .map((id) => activos.find((lead) => lead.id === id))
    .filter((lead): lead is Lead => !!lead);

  const alternarLead = (id: string) =>
    setLeadIds((previos) => (previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id]));

  const guardar = () => {
    if (!limpio) return;
    onSave({
      titulo: limpio,
      descripcion: descripcion.trim(),
      leadIds,
      leadListIds,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + 'T23:59:59').toISOString() : '',
      importante,
      color,
      /*
       * La seccion no se edita aca: se cambia arrastrando en el tablero, que es
       * donde se ve el reparto. Se conserva la que tenia para que guardar desde
       * el formulario no la saque de su columna.
       */
      sectionId: task?.sectionId ?? null,
    });
  };

  const campos = (
          <div className="flex flex-col gap-2">
            <Input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="¿Qué hay que hacer?"
              aria-label="Título de la tarea"
              autoFocus
            />

            <Textarea
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="Detalle (opcional)"
              aria-label="Descripción"
              rows={2}
            />

            <div>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(evento) => setFechaVencimiento(evento.target.value)}
                aria-label="Fecha de vencimiento"
              />
              <p className="mt-1 text-micro text-ink-secondary">{explicarUrgencia(fechaVencimiento)}</p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2.5 py-2">
              <input
                type="checkbox"
                checked={importante}
                onChange={(evento) => setImportante(evento.target.checked)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
              />
              <span className="text-meta text-ink">Es importante</span>
              <span className="min-w-0 flex-1 truncate text-micro text-ink-secondary">
                · me acerca a un objetivo
              </span>
            </label>

            {/*
              COLOR. Opcional y sin color por defecto: si todas las tareas
              estuvieran pintadas, el color dejaria de senalar nada. El primer
              circulo es "sin color" y no un color mas.
            */}
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-micro text-ink-secondary">Color</span>
              <button
                type="button"
                onClick={() => setColor(null)}
                aria-pressed={color === null}
                title="Sin color"
                aria-label="Sin color"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  color === null ? 'border-primary ring-1 ring-focus' : 'border-line'
                }`}
              >
                <span className="text-micro text-ink-muted">—</span>
              </button>
              {COLORES_DE_TAREA.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-pressed={color === hex}
                  title={nombreDeColor(hex)}
                  aria-label={nombreDeColor(hex)}
                  className={`h-5 w-5 shrink-0 rounded-full border transition-transform ${
                    color === hex ? 'border-primary ring-1 ring-focus' : 'border-line-soft'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            {/* Leads, plegados. */}
            <div className="rounded-md border border-line">
              <button
                type="button"
                onClick={() => setLeadsAbiertos((estaba) => !estaba)}
                aria-expanded={leadsAbiertos}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
              >
                <span className="min-w-0 truncate text-meta text-ink">
                  {elegidos.length === 0
                    ? 'Sin leads asignados'
                    : elegidos.map((lead) => nombreVisible(lead.name)).join(', ')}
                </span>
                <span
                  className={`shrink-0 text-ink-muted transition-transform [&_svg]:h-3 [&_svg]:w-3 ${
                    leadsAbiertos ? 'rotate-180' : ''
                  }`}
                >
                  <Icon.ChevronDown />
                </span>
              </button>

              {leadsAbiertos && (
                <div className="border-t border-line-soft p-2">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Input
                      type="search"
                      value={busqueda}
                      onChange={(evento) => setBusqueda(evento.target.value)}
                      placeholder="Buscar lead..."
                      aria-label="Buscar lead"
                      className="flex-1"
                    />
                    <SinNombreToggle
                      count={sinNombreTotal}
                      ocultos={ocultarSinNombre}
                      onToggle={() => setOcultarSinNombre((v) => !v)}
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto">
                    {visibles.length === 0 ? (
                      <p className="py-3 text-center text-micro text-ink-secondary">Sin resultados.</p>
                    ) : (
                      visibles.map((lead) => (
                        <label
                          key={lead.id}
                          className="flex min-h-[28px] cursor-pointer items-center gap-2 rounded px-1 hover:bg-surface-hover"
                        >
                          <input
                            type="checkbox"
                            checked={leadIds.includes(lead.id!)}
                            onChange={() => alternarLead(lead.id!)}
                            className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-line accent-[var(--ls-primary)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-meta text-ink">
                            {nombreVisible(lead.name)}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {lists.length > 0 && (
              <div>
                <p className="mb-1 text-micro font-medium text-ink-secondary">Listas</p>
                <div className="flex flex-wrap gap-1.5">
                  {lists.map((list) => {
                    const puesta = leadListIds.includes(list.id!);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() =>
                          setLeadListIds((previos) =>
                            previos.includes(list.id!)
                              ? previos.filter((x) => x !== list.id)
                              : [...previos, list.id!],
                          )
                        }
                        aria-pressed={puesta}
                        /*
                          Relleno de marca y punto de color, no texto blanco
                          sobre el color de la lista: eso fallaba AA con toda la
                          paleta -entre 2.15:1 y 4.23-. El color pasa al punto,
                          que es refuerzo y no portador.
                        */
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro font-medium transition-colors ${
                          puesta
                            ? 'border-transparent bg-primary text-ink-inverse'
                            : 'border-line bg-surface text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {!puesta && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                        )}
                        {list.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
  );

  const botonGuardar = (
    <Button variant="primary" size="sm" onClick={guardar}>
      {limpio ? (task ? 'Guardar' : 'Crear tarea') : 'Ponele un título'}
    </Button>
  );

  /*
   * PANTALLA COMPLETA.
   *
   * Abrir una tarea no deberia ser una capa encima del tablero: el detalle es a
   * donde vas, no algo que se asoma. Con la flecha se vuelve exactamente a la
   * vista que estabas mirando, porque quien lo monta no cambia de vista.
   */
  if (modo === 'pagina') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            title="Volver"
            aria-label="Volver"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-4 [&_svg]:w-4"
          >
            <Icon.ArrowLeft />
          </button>

          {task && onToggleComplete && (
            <Button size="sm" onClick={() => onToggleComplete(task)} className="shrink-0">
              {task.status === 'completada' ? 'Reabrir' : 'Marcar como finalizada'}
            </Button>
          )}

          <span className="min-w-0 flex-1" />
          {botonGuardar}
        </div>

        {campos}
      </div>
    );
  }

  return (
    <Modal onClose={onCancel} maxWidth="380px" label={task ? 'Editar tarea' : 'Nueva tarea'} align="top">
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
          <h2 className="text-meta font-semibold text-ink">{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button
            type="button"
            onClick={onCancel}
            title="Cerrar"
            aria-label="Cerrar"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-3 [&_svg]:w-3"
          >
            <Icon.Close />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{campos}</div>

        <div className="flex justify-end gap-2 border-t border-line px-3 py-2.5">
          <Button size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          {botonGuardar}
        </div>
      </div>
    </Modal>
  );
}
