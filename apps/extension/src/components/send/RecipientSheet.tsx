import type { Lead, LeadList } from '../../types';
import { useMemo, useState } from 'react';
import { LeadHistoryView } from './LeadHistoryView';
import type { EmailTemplate, WhatsAppTemplate } from '../../types';
import { useLeadSendSummary } from '../../hooks/useLeadSendSummary';
import { Button, IconButton, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import { RecipientPicker } from './RecipientPicker';
import { RecipientListPicker } from './RecipientListBar';
import { puedeRecibirPor, type CanalContacto } from '../../utils/leadContacto';

/**
 * HOJA DE DESTINATARIOS
 *
 * El mismo `RecipientPicker` de siempre, en una hoja en vez de incrustado en la
 * pagina. No cambia su logica: sigue filtrando por canal con `puedeRecibirPor`,
 * sigue paginando de a ocho y sigue avisando de los descartados. Lo unico que
 * cambia es donde se pinta.
 *
 * ## El estado se queda en el sender
 *
 * La hoja no guarda nada: `selectedLeadIds` y `selectedListIds` siguen viviendo
 * en el sender, que es quien calcula `recipients` y quien envia. Si el estado
 * viviera aca, cerrarla lo borraria.
 *
 * La busqueda, la pagina y el filtro de leads sin nombre tampoco viven aca.
 * La pagina si moria al cerrar, por la razon de arriba: recordar la pagina 7
 * de una busqueda vieja confunde. Pero el envio de a uno -misma plantilla,
 * otro contacto, abrir y cerrar la hoja en cada vuelta- no es una busqueda
 * vieja: es la misma tanda, y volver a la pagina 1 en cada envio obligaba a
 * repaginar a mano. Ahora la guarda el compositor, que la reinicia al cambiar
 * de plantilla, que es cuando de verdad empieza otra cosa.
 *
 * ## Por que no lleva boton de cancelar
 *
 * Cada casilla se aplica en el acto, asi que no hay nada que confirmar ni que
 * deshacer en bloque: "Listo" solo cierra. Un "Cancelar" al lado prometeria que
 * revierte la seleccion, y no lo haria.
 */
/**
 * El resumen de envios se pide AQUI y no en el compositor: solo hace falta con
 * la hoja abierta, y montarla es justo el momento en que alguien se pregunta a
 * quien le toca. Pedirlo antes seria una consulta por cada visita a Mensajes.
 */
export function RecipientSheet({
  leads,
  leadLists,
  selectedLeadIds,
  selectedListIds,
  onToggleLead,
  onToggleLeads,
  onToggleList,
  onClear,
  search,
  onSearchChange,
  pagina,
  onPaginaChange,
  ocultarSinNombre,
  onOcultarSinNombreChange,
  sentLeadIds,
  plantillas,
  categorias,
  canal,
  count,
  onClose,
}: {
  leads: Lead[];
  leadLists: LeadList[];
  selectedLeadIds: Set<string>;
  selectedListIds: Set<number>;
  onToggleLead: (id: string) => void;
  onToggleLeads: (ids: string[], seleccionar: boolean) => void;
  onToggleList: (id: number) => void;
  onClear: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  pagina: number;
  onPaginaChange: (pagina: number) => void;
  ocultarSinNombre: boolean;
  onOcultarSinNombreChange: (valor: boolean) => void;
  sentLeadIds: Set<string>;
  /** Plantillas y categorias del canal, para resolver el ultimo envio de cada lead. */
  plantillas?: { id?: string | number; templateListIds?: number[] }[];
  categorias?: { id?: number; name: string; color: string }[];
  canal: CanalContacto;
  count: number;
  onClose: () => void;
}) {
  const { resumen: resumenDeEnvios, estado: estadoDelResumen } = useLeadSendSummary();
  const [leadEnHistorial, setLeadEnHistorial] = useState<string | null>(null);

  /*
   * Quien puede recibir por este canal. Se calcula aca, arriba de todo, porque
   * lo necesitan dos piezas que estan en extremos opuestos de la hoja: la lista
   * de leads y el desplegable de listas del pie, que promete la misma cifra.
   * Calculado dos veces podian discrepar.
   */
  const contactables = useMemo(
    () => leads.filter((lead) => puedeRecibirPor(lead, canal)),
    [leads, canal],
  );

  /*
   * VER SOLO UNA LISTA. Es filtro de vista y nada mas: no toca la seleccion.
   *
   * Antes esto no existia y el filtrado lo hacia `selectedListIds`, el mismo
   * estado con el que se AGREGAN listas enteras al envio. Un unico estado con
   * dos significados: mirar y elegir. Ahora son dos, y cada control hace una
   * sola cosa.
   *
   * Vive aca y no en el picker porque el control que lo cambia esta en el pie.
   */
  const [verListaId, setVerListaId] = useState<number | null>(null);

  const leadDelHistorial = leadEnHistorial
    ? leads.find((l) => l.id === leadEnHistorial) ?? null
    : null;

  /*
   * El historial REEMPLAZA el contenido de la hoja, no se abre encima.
   *
   * Dos velos apilados en un panel de 400px de alto dejan la pantalla
   * ilegible, y con dos dialogos abiertos el usuario no sabe cual cierra
   * Escape. Aca la hoja cambia de vista y se vuelve con la flecha, que es lo
   * mismo que ya hace el detalle de una tarea.
   */
  if (leadDelHistorial) {
    return (
      <Modal
        onClose={onClose}
        maxWidth="520px"
        align="top"
        label={`Mensajes enviados a ${leadDelHistorial.name}`}
      >
        <div className="flex h-[85vh] flex-col">
          <LeadHistoryView
            lead={leadDelHistorial}
            plantillasWhatsApp={canal === 'email' ? [] : (plantillas as WhatsAppTemplate[])}
            plantillasEmail={canal === 'email' ? (plantillas as EmailTemplate[]) : []}
            categorias={categorias ?? []}
            onVolver={() => setLeadEnHistorial(null)}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} maxWidth="520px" align="top" label="Elegir destinatarios">
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">Destinatarios</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <RecipientPicker
            leads={leads}
            leadLists={leadLists}
            selectedLeadIds={selectedLeadIds}
            selectedListIds={selectedListIds}
            onToggleLead={onToggleLead}
            onToggleLeads={onToggleLeads}
            onToggleList={onToggleList}
            contactables={contactables}
            verListaId={verListaId}
            search={search}
            onSearchChange={onSearchChange}
            pagina={pagina}
            onPaginaChange={onPaginaChange}
            ocultarSinNombre={ocultarSinNombre}
            onOcultarSinNombreChange={onOcultarSinNombreChange}
            sentLeadIds={sentLeadIds}
            resumenDeEnvios={resumenDeEnvios}
            estadoDelResumen={estadoDelResumen}
            onVerHistorial={setLeadEnHistorial}
            plantillas={plantillas}
            categorias={categorias}
            canal={canal}
          />
        </div>

        {/*
          EL PIE: elegir una lista, limpiar, y cerrar. Todo en un renglon.
          
          Las tres cosas se hacen en el mismo momento -justo antes de cerrar- y
          cada una vivia en su propia fila, tres renglones sobre una lista que ya
          peleaba por el alto. Juntas ahorran dos.

          Ademas resuelve donde poner "Limpiar". Estaba al fondo de la zona que
          scrollea: al desplegar los filtros se iba de vista, justo cuando mas
          falta hace. El pie no scrollea nunca.

          "Limpiar" es un icono y no una palabra por el ancho: en 470px, con el
          desplegable de listas y su boton en la misma fila, no entra un tercer
          rotulo. Lleva `aria-label`, asi que para un lector de pantalla se
          anuncia igual de claro que antes.
        */}
        <div className="flex items-center gap-1.5 border-t border-line px-4 py-2.5">
          <RecipientListPicker
            leadLists={leadLists}
            contactables={contactables}
            verListaId={verListaId}
            onVerListaChange={setVerListaId}
            selectedListIds={selectedListIds}
            onToggleList={onToggleList}
          />

          {count > 0 && (
            <IconButton
              icon={<Icon.Close />}
              label="Limpiar los destinatarios elegidos"
              onClick={onClear}
              size="sm"
            />
          )}

          {/* Se queda con el ancho que sobra: es la accion de la barra, y sin
              listas -cuenta nueva- toma la fila entera sin caso especial. */}
          <Button
            variant="primary"
            onClick={onClose}
            className="h-control-lg flex-1 px-4 font-semibold"
          >
            Listo{count > 0 ? ` (${count})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
