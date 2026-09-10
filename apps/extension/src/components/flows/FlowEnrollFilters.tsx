import { useState } from 'react';
import { IconButton, Input, OverlayCount, Select } from '../../design';
import { Icon } from '../../utils/icons';
import SinNombreToggle from '../leads/SinNombreToggle';
import {
  INSCRIPCIONES_CANDIDATO,
  ORDENES_CANDIDATO,
  type CriterioInscripcion,
  type CriterioOrdenCandidato,
} from '../../services/flowEnrollSort';

/**
 * LOS FILTROS DE LA LISTA DE CANDIDATOS A UN FLUJO
 *
 * Es el gemelo de `RecipientFilters`, el del envio masivo, y lo es a proposito:
 * las dos pantallas hacen lo mismo -elegir gente de la misma agenda- y hasta
 * ahora una tenia buscador, filtros y orden y la otra solo un buscador. La
 * misma tarea se resolvia de dos formas distintas segun por donde entraras.
 *
 * ## Por que se pliega
 *
 * Porque esta pantalla NO puede crecer. La lista de candidatos es lo unico que
 * se viene a mirar aqui, y cada fila de controles fija se la come. En reposo
 * queda UNA fila -buscar, ocultar sin nombre y el embudo- y los dos selectores
 * salen solo si se piden.
 *
 * El embudo lleva encima cuantos filtros hay puestos, y eso es lo que hace que
 * plegarlos no sea esconderlos: si algo esta filtrando, se ve sin abrir nada.
 * Sin ese contador esto seria una trampa -la lista mostraria menos leads de los
 * que hay y nada lo explicaria-.
 *
 * El orden no suma al contador porque no esconde a nadie; el boton igual se
 * pinta destacado si esta tocado. Mismo criterio que en el envio masivo.
 */
const PANEL_ID = 'filtros-inscribir';

export function FlowEnrollFilters({
  busqueda,
  onBusquedaChange,
  sinNombre,
  ocultarSinNombre,
  onOcultarSinNombreChange,
  inscripcion,
  onInscripcionChange,
  orden,
  onOrdenChange,
}: {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  sinNombre: number;
  ocultarSinNombre: boolean;
  onOcultarSinNombreChange: (valor: boolean) => void;
  inscripcion: CriterioInscripcion;
  onInscripcionChange: (criterio: CriterioInscripcion) => void;
  orden: CriterioOrdenCandidato;
  onOrdenChange: (criterio: CriterioOrdenCandidato) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  const activos = inscripcion !== 'todos' ? 1 : 0;
  const hayAlgoTocado = activos > 0 || orden !== 'nombre';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="search"
          value={busqueda}
          onChange={(evento) => onBusquedaChange(evento.target.value)}
          placeholder="Buscar lead..."
          aria-label="Buscar lead por nombre"
          autoFocus
          className="flex-1"
        />
        <SinNombreToggle
          count={sinNombre}
          ocultos={ocultarSinNombre}
          onToggle={() => onOcultarSinNombreChange(!ocultarSinNombre)}
        />
        {/* `relative` para que el contador se cuelgue de la esquina del boton. */}
        <div className="relative shrink-0">
          <IconButton
            icon={<Icon.Funnel />}
            label={abierto ? 'Ocultar los filtros' : 'Filtrar y ordenar'}
            variant={abierto || hayAlgoTocado ? 'secondary' : 'ghost'}
            onClick={() => setAbierto((estaba) => !estaba)}
            aria-expanded={abierto}
            aria-controls={PANEL_ID}
          />
          <OverlayCount count={activos} label="filtros puestos" />
        </div>
      </div>

      {abierto && (
        <div id={PANEL_ID} className="grid grid-cols-2 gap-1.5">
          <Select
            value={inscripcion}
            onChange={(evento) => onInscripcionChange(evento.target.value as CriterioInscripcion)}
            compact
            aria-label="Filtrar por si ya está en un flujo"
            className="min-w-0"
          >
            {INSCRIPCIONES_CANDIDATO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                Flujo: {opcion.label}
              </option>
            ))}
          </Select>

          <Select
            value={orden}
            onChange={(evento) => onOrdenChange(evento.target.value as CriterioOrdenCandidato)}
            compact
            aria-label="Ordenar los candidatos"
            className="min-w-0"
          >
            {ORDENES_CANDIDATO.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                Orden: {opcion.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
