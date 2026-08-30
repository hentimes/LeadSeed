import { useState } from 'react';
import type { Page } from '../types';
import { Icon } from '../utils/icons';
import {
  Input,
  ListPanel,
  ListPagination,
  SegmentedControl,
  Select,
  Skeleton,
} from '../design';
import { useSendHistory, type FiltroDeCanal } from '../hooks/useSendHistory';
import { SendHistoryRow } from '../components/history/SendHistoryRow';
import { SendHistoryMessageModal } from '../components/history/SendHistoryMessageModal';
import { ORDENES } from '../utils/sendHistorySort';
import type { EnrichedLog } from '../services/historyService';

interface Props {
  onNavigate: (page: Page) => void;
  onViewTemplate: (type: 'whatsapp' | 'email' | 'call', id: number) => void;
}

/**
 * Los canales, solo con icono.
 *
 * `collapseLabels` no sirve aca porque exige que TODAS las opciones traigan
 * icono, y "Todos" no tiene uno propio que signifique algo. Se pone el rotulo
 * corto en esa y el icono en las tres reales.
 */
const CANALES: { value: FiltroDeCanal; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Llamadas' },
];

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * EL HISTORIAL DE ENVIOS
 *
 * Se llega desde Mensajes, por el icono de reloj de la barra. Dejo de estar en
 * el rail: no es un destino de trabajo, es la consulta de lo que ya paso.
 *
 * Antes eran 185 lineas que hacian todo. El estado vive ahora en
 * `useSendHistory`, la fila en `SendHistoryRow` y el mensaje en su modal; aca
 * queda el armado.
 *
 * ## Lo que se arreglo, que no era solo estetico
 *
 * El nombre de la plantilla se pintaba subrayado y en azul -la cosa mas
 * clicable de la fila- y al tocarlo **no pasaba nada**, nunca. `openTemplate`
 * hacia `Number(log.templateId)` sobre un uuid: `NaN`, y la guarda
 * `Number.isFinite` cortaba ahi. Por eso "si haces click no lo muestra".
 *
 * Ahora ese enlace abre el mensaje que se envio de verdad, que es lo unico que
 * alguien podia estar esperando de el.
 */
export default function SendHistoryPage({ onViewTemplate }: Props) {
  const historial = useSendHistory();
  const [mensajeAbierto, setMensajeAbierto] = useState<EnrichedLog | null>(null);

  /*
   * `undefined` con una sola pagina, y no el componente.
   *
   * `ListPanel` pinta su cabecera si recibe `headerActions`, y `ListPagination`
   * devuelve `null` cuando no hay que paginar: pasarlo siempre dejaria una
   * franja gris de 34px vacia encima de la lista. En un panel de 400px de alto,
   * 34px por nada son dos filas del historial.
   */
  const paginador =
    historial.totalPaginas > 1 ? (
      <ListPagination
        page={historial.pagina}
        pageCount={historial.totalPaginas}
        onPageChange={historial.setPagina}
      />
    ) : undefined;

  // `onViewTemplate` sigue en las props porque `AppPageRenderer` lo pasa y
  // porque el salto a la plantilla es una funcion que puede volver. Hoy no hay
  // ningun boton que lo dispare: llevaba a Plantillas desde una pantalla que se
  // abre para leer un mensaje, que es justo perder el sitio donde estabas.
  void onViewTemplate;

  if (historial.cargando) {
    return (
      <div role="status" aria-label="Cargando el historial" className="flex flex-col gap-2">
        <Skeleton shape="block" height="30px" />
        <Skeleton shape="block" height="240px" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Fila 1: buscar. A ancho completo porque es lo que mas se usa. */}
      <Input
        value={historial.busqueda}
        onChange={(evento) => historial.setBusqueda(evento.target.value)}
        placeholder="Buscar lead, plantilla o texto del mensaje…"
        aria-label="Buscar en el historial"
        className="h-control-sm text-meta"
      />

      {/* Fila 2: que se lista. Dos pestanas y no un desplegable: son dos, y con
          dos un desplegable esconde la mitad de la pantalla detras de un toque. */}
      <SegmentedControl
        options={[
          { value: 'envios', label: `Envíos ${historial.totalEnvios}` },
          { value: 'actividad', label: `Actividad ${historial.totalActividad}` },
        ]}
        value={historial.pestana}
        onChange={(valor) => historial.setPestana(valor as 'envios' | 'actividad')}
        label="Qué se lista"
        className="w-full [&>button]:flex-1"
      />

      {historial.pestana === 'envios' && (
        <div className="flex items-center gap-1.5">
          <SegmentedControl
            options={CANALES}
            value={historial.canal}
            onChange={historial.setCanal}
            label="Canal"
            className="shrink-0"
          />

          {/*
            Criterio y direccion FUNDIDOS en un solo desplegable.

            En 336px un control es lo que hay, no dos. Y una flecha suelta no
            dice hacia donde ordena: "arriba" en fechas puede ser lo mas nuevo o
            lo mas viejo segun a quien le preguntes. Con palabras -"Más
            recientes primero"- no hay lectura posible mas que una.
          */}
          <Select
            value={historial.orden}
            onChange={(evento) => historial.setOrden(evento.target.value)}
            aria-label="Ordenar el historial"
            compact
            className="min-w-0 flex-1"
          >
            {ORDENES.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {historial.pestana === 'envios' ? (
        <ListPanel
          empty={
            <p className="px-3 py-8 text-center text-meta text-ink-secondary">
              {historial.busqueda ? 'Ningún envío coincide.' : 'Todavía no enviaste nada.'}
            </p>
          }
          headerActions={paginador}
        >
          {historial.logsDeLaPagina.map((log) => (
            <SendHistoryRow
              key={log.id}
              log={log}
              onAbrirMensaje={setMensajeAbierto}
              onEliminar={(elegido) => {
                if (elegido.id != null) void historial.eliminar(elegido.id);
              }}
              onRestaurar={(elegido) => {
                if (elegido.id != null) void historial.restaurar(elegido.id);
              }}
            />
          ))}
        </ListPanel>
      ) : (
        <ListPanel
          empty={
            <p className="px-3 py-8 text-center text-meta text-ink-secondary">
              No hay actividad.
            </p>
          }
          headerActions={paginador}
        >
          {historial.actividadDeLaPagina.map((item, indice) => (
            <div
              key={`${item.time}-${indice}`}
              className="flex h-row-dense items-center gap-2 border-b border-line px-2.5 last:border-0"
            >
              {/* El icono dice el tipo por forma; antes eran las siglas "WA/@" y
                  "N", que hay que aprenderse. */}
              <span
                aria-label={item.type === 'send' ? 'Envío' : 'Nota'}
                title={item.type === 'send' ? 'Envío' : 'Nota'}
                className="flex w-3.5 shrink-0 justify-center text-ink-secondary [&_svg]:h-3 [&_svg]:w-3"
              >
                {item.type === 'send' ? <Icon.Send /> : <Icon.Edit />}
              </span>
              <span className="min-w-0 flex-1 truncate text-meta text-ink">{item.text}</span>
              <span className="shrink-0 text-micro tabular-nums text-ink-secondary">
                {fechaCorta(item.time)}
              </span>
            </div>
          ))}
        </ListPanel>
      )}

      {mensajeAbierto && (
        <SendHistoryMessageModal
          log={mensajeAbierto}
          onClose={() => setMensajeAbierto(null)}
        />
      )}
    </div>
  );
}
