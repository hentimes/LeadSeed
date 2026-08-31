import type { Lead, LeadList } from '../../types';
import { useState } from 'react';
import { LeadHistoryView } from './LeadHistoryView';
import type { EmailTemplate, WhatsAppTemplate } from '../../types';
import { useLeadSendSummary } from '../../hooks/useLeadSendSummary';
import { Button, Modal } from '../../design';
import { RecipientPicker } from './RecipientPicker';
import type { CanalContacto } from '../../utils/leadContacto';

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
 * Lo unico que se pierde al cerrar es la pagina y la busqueda, que son estado
 * de consulta y no de trabajo. Es una decision, no un descuido: recordar la
 * pagina 7 de una busqueda vieja confunde mas de lo que ayuda.
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
  onToggleList,
  onClear,
  search,
  onSearchChange,
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
  onToggleList: (id: number) => void;
  onClear: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  sentLeadIds: Set<string>;
  /** Plantillas y categorias del canal, para resolver el ultimo envio de cada lead. */
  plantillas?: { id?: string | number; templateListIds?: number[] }[];
  categorias?: { id?: number; name: string; color: string }[];
  canal: CanalContacto;
  count: number;
  onClose: () => void;
}) {
  const resumenDeEnvios = useLeadSendSummary();
  const [leadEnHistorial, setLeadEnHistorial] = useState<string | null>(null);

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
      <Modal onClose={onClose} maxWidth="520px" label={`Mensajes enviados a ${leadDelHistorial.name}`}>
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
    <Modal onClose={onClose} maxWidth="520px" label="Elegir destinatarios">
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
            onToggleList={onToggleList}
            onClear={onClear}
            search={search}
            onSearchChange={onSearchChange}
            sentLeadIds={sentLeadIds}
            resumenDeEnvios={resumenDeEnvios}
            onVerHistorial={setLeadEnHistorial}
            plantillas={plantillas}
            categorias={categorias}
            canal={canal}
          />
        </div>

        <div className="border-t border-line px-4 py-2.5">
          <Button variant="primary" onClick={onClose} className="h-control-lg w-full font-semibold">
            Listo{count > 0 ? ` (${count})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
