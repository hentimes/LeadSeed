import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLeads } from './useLeads';
import { useEmailTemplates, useWhatsAppTemplates } from './useTemplates';
import {
  buildActivityFeed,
  enrichSendLogs,
  fetchRecentHistoryData,
  softDeleteSendLog,
  type ActivityItem,
  type EnrichedLog,
} from '../services/historyService';
import { getPlatform } from '../platform/registry';
import {
  ORDEN_POR_DEFECTO,
  ordenPorValor,
  ordenarHistorial,
} from '../utils/sendHistorySort';

export const TAMANO_DE_PAGINA = 12;

export type FiltroDeCanal = 'todos' | 'whatsapp' | 'email' | 'call';

/**
 * ESTADO DEL HISTORIAL DE ENVIOS
 *
 * Se saca de la pagina para que la pantalla solo dibuje. `SendHistoryPage` tenia
 * las 185 lineas juntas: carga, filtros, orden, paginacion y marcado.
 *
 * ## Lo eliminado se sigue trayendo
 *
 * El repositorio NO filtra `deleted_at` en la consulta, y es a proposito: si lo
 * filtrara, la fila no llegaria hasta aca y no habria con que pintar la lapida.
 * Quien decide que mostrar es la vista, no el SQL.
 */
export function useSendHistory() {
  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [canal, setCanal] = useState<FiltroDeCanal>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<string>(ORDEN_POR_DEFECTO);
  const [pestana, setPestana] = useState<'envios' | 'actividad'>('envios');
  const [pagina, setPagina] = useState(0);

  const { getAll: getLeads } = useLeads();
  const { getAll: getWaTemplates } = useWhatsAppTemplates();
  const { getAll: getEmailTemplates } = useEmailTemplates();

  const cargar = useCallback(async () => {
    const [{ logs: crudos, notes }, waTemplates, emailTemplates, leads] = await Promise.all([
      fetchRecentHistoryData(),
      getWaTemplates(),
      getEmailTemplates(),
      getLeads(),
    ]);

    setLogs(enrichSendLogs(crudos, waTemplates, emailTemplates));
    setActivity(buildActivityFeed(crudos, notes, leads));
    setCargando(false);
    // Los hooks devuelven funciones nuevas en cada render; depender de ellas
    // dispararia la carga en bucle. Es el mismo criterio de `SendPage`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const buscado = busqueda.toLowerCase().trim();

  const logsVisibles = useMemo(() => {
    let resultado = logs;

    if (canal !== 'todos') {
      resultado = resultado.filter((log) => log.templateType === canal);
    }

    if (buscado) {
      resultado = resultado.filter(
        (log) =>
          (log.leadName || '').toLowerCase().includes(buscado) ||
          (log.leadPhone || '').includes(buscado) ||
          (log.templateNombre || '').toLowerCase().includes(buscado) ||
          // Tambien por el texto del mensaje: ahora que se guarda, buscar "precio"
          // y encontrar a quien se le hablo de precios es lo que uno espera.
          (log.templateContenido || '').toLowerCase().includes(buscado),
      );
    }

    const { criterio, direccion } = ordenPorValor(orden);
    return ordenarHistorial(resultado, criterio, direccion);
  }, [logs, canal, buscado, orden]);

  const actividadVisible = useMemo(() => {
    if (!buscado) return activity;
    return activity.filter(
      (item) =>
        (item.leadName || '').toLowerCase().includes(buscado) ||
        (item.text || '').toLowerCase().includes(buscado),
    );
  }, [activity, buscado]);

  const total = pestana === 'envios' ? logsVisibles.length : actividadVisible.length;
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_DE_PAGINA));

  /*
   * La pagina se corrige cuando se queda fuera de rango.
   *
   * Pasa al filtrar estando en la pagina 3: si el resultado tiene una sola
   * pagina, sin esto la lista queda vacia y parece que no hay resultados,
   * cuando en realidad estabas mirando mas alla del final.
   */
  const paginaSegura = Math.min(pagina, totalPaginas - 1);

  const logsDeLaPagina = logsVisibles.slice(
    paginaSegura * TAMANO_DE_PAGINA,
    (paginaSegura + 1) * TAMANO_DE_PAGINA,
  );
  const actividadDeLaPagina = actividadVisible.slice(
    paginaSegura * TAMANO_DE_PAGINA,
    (paginaSegura + 1) * TAMANO_DE_PAGINA,
  );

  /**
   * Marca o restaura una fila.
   *
   * Se actualiza el estado local en vez de recargar todo: recargar reordena la
   * lista y hace saltar el sitio donde estabas mirando, para un cambio que ya
   * se sabe cual es.
   */
  const marcar = async (logId: number, eliminado: boolean) => {
    if (eliminado) {
      const confirmado = await getPlatform().dialogs.confirm(
        'Se puede restaurar después. El envío sigue contando en los totales del lead.',
        { title: '¿Eliminar esta línea del historial?', confirmLabel: 'Eliminar', tone: 'danger' },
      );
      if (!confirmado) return;
    }

    await softDeleteSendLog(logId, eliminado);

    setLogs((actuales) =>
      actuales.map((log) =>
        log.id === logId
          ? { ...log, deletedAt: eliminado ? new Date().toISOString() : undefined }
          : log,
      ),
    );
  };

  /** Cualquier cambio de filtro vuelve a la primera pagina. */
  const cambiarYVolverAlInicio = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPagina(0);
  };

  return {
    cargando,
    pestana,
    setPestana: cambiarYVolverAlInicio(setPestana),
    busqueda,
    setBusqueda: cambiarYVolverAlInicio(setBusqueda),
    canal,
    setCanal: cambiarYVolverAlInicio(setCanal),
    orden,
    setOrden: cambiarYVolverAlInicio(setOrden),
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    totalEnvios: logsVisibles.length,
    totalActividad: actividadVisible.length,
    logsDeLaPagina,
    actividadDeLaPagina,
    eliminar: (logId: number) => marcar(logId, true),
    restaurar: (logId: number) => marcar(logId, false),
  };
}
