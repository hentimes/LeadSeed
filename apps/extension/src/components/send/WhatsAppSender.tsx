import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, WhatsAppTemplate, WhatsAppTemplateList, LeadList, SendLog } from '../../types';
import type { SendActionState } from './channels';
import { useSendAction } from './useSendAction';
import { buildLeadMessages } from '../../utils/waHelper';
import { useWhatsAppQueue } from '../../hooks/useWhatsAppQueue';
import { useMessageReasons } from '../../hooks/useMessageReasons';
import { getSettings } from '../../services/appSettingsService';
import { ReasonPicker } from './ReasonPicker';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, logWhatsAppSend } from '../../services/sendService';
import { Badge, Field, Select, Textarea } from '../../design';
import { SendStep, SendRequisito } from './SendStep';
import { puedeRecibirPor } from '../../utils/leadContacto';
import { TemplatePicker } from './TemplatePicker';
import { RecipientSheet } from './RecipientSheet';
import { useRecipientBrowsing } from './useRecipientBrowsing';
import { useSendSession } from './useSendSession';
import { RecipientSummaryRow } from './RecipientSummaryRow';
import { SendConfirmModal, RecipientSummary } from './SendConfirmModal';
import { SendHistoryDisclosure } from './SendHistoryDisclosure';
import WhatsAppQueuePanel from './WhatsAppQueuePanel';

interface Props {
  leads: Lead[];
  templates: WhatsAppTemplate[];
  templateLists: WhatsAppTemplateList[];
  leadLists: LeadList[];
  /** Le dice al pie fijo de `SendPage` como tiene que verse su boton. */
  onActionChange: (action: SendActionState) => void;
}

/**
 * Lienzo del chat de WhatsApp. Es color de marca ajena, como el #25D366:
 * una de las excepciones que documenta el README del sistema de diseno.
 *
 * La burbuja que va encima tampoco usa tokens y es a proposito: el lienzo
 * es claro y fijo en los dos temas, asi que un `text-ink` que se vuelve
 * casi blanco en modo oscuro dejaria el mensaje ilegible. La vista previa
 * imita WhatsApp, no la app.
 */
const WHATSAPP_CANVAS = '#efeae2';

/**
 * Lead ficticio para la vista previa cuando todavia no se eligio destinatario.
 * Los mismos datos que usa el editor de plantillas, para que la frase se lea
 * igual en los dos sitios.
 */
const LEAD_DE_EJEMPLO = {
  name: 'María González',
  phone: '+56912345678',
  email: 'maria@ejemplo.cl',
  company: 'Empresa Demo',
  rut: '12345678-9',
  notes: 'Cliente VIP',
} as Lead;

export default function WhatsAppSender({ leads, templates, templateLists, leadLists, onActionChange }: Props) {
  const sesion = useSendSession('whatsapp');

  /*
   * Se arranca donde se dejo. El compositor abria siempre en blanco, y quien
   * manda la misma plantilla decenas de veces al dia volvia a elegir categoria
   * y plantilla en cada visita a Mensajes.
   */
  const [catId, setCatId] = useState<number | null>(sesion.ultima.categoriaId);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(
    () => templates.find((t) => String(t.id) === sesion.ultima.plantillaId) ?? null,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  /** Para llevar el foco al selector cuando el boton dice "Elegi una plantilla". */
  const plantillaRef = useRef<HTMLDivElement>(null);

  // Edición dinámica al vuelo
  const [customBody, setCustomBody] = useState('');

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());

  // Busqueda, pagina y filtro de la hoja de destinatarios. Viven aca porque
  // la hoja se desmonta al cerrarse y enviar de a uno es abrirla y cerrarla
  // en cada vuelta.
  const navegacion = useRecipientBrowsing(selectedTemplate?.id ?? null);
  const [sentLog, setSentLog] = useState<SendLog[]>([]);

  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  /*
   * El envio va de a uno.
   *
   * Antes se abrian los N chats en un bucle sin esperar, y el proceso de fondo
   * reutiliza siempre la misma pestana de WhatsApp Web: los N se pisaban ahi y
   * solo sobrevivia uno, mientras el historial ya los daba todos por enviados.
   * La cola abre uno, espera a que se envie, y sigue.
   */
  /*
   * LA PLANTILLA DE LA TANDA SE CONGELA AL EMPEZAR.
   *
   * El selector sigue usable con una cola en marcha, y este callback leia
   * `selectedTemplate` en cada avance. Cambiar de plantilla entre destinatarios
   * mandaba el texto de la vieja -ya resuelto en los mensajes de la cola- y lo
   * registraba bajo el id y el nombre de la nueva: el historial y los
   * contadores por plantilla quedaban cruzados, que es justo lo que la cola
   * vino a arreglar.
   */
  const plantillaDeLaTanda = useRef<{ id: string | number; nombre: string } | null>(null);

  const cola = useWhatsAppQueue({
    onAbierto: async (mensaje) => {
      const session = await getCurrentSession();
      const userId = session?.user?.id;
      const plantilla = plantillaDeLaTanda.current;
      if (!userId || !plantilla) return;

      // Se registra el que se acaba de abrir, no el envio entero.
      setSentLog(await logWhatsAppSend(userId, plantilla.id, [mensaje], plantilla.nombre));
      await sesion.refrescarContador();
    },
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);

  // Motivo del mensaje: se elige una vez por envio, no por destinatario.
  const { motivos: reasons } = useMessageReasons();
  const [motivoId, setMotivoId] = useState<number | null>(null);

  /**
   * Donde se va a abrir WhatsApp.
   *
   * El modal de confirmacion decia siempre "Se abrira WhatsApp Web", incluso
   * con la preferencia puesta en la app de escritorio: afirmaba algo falso
   * justo en la pantalla donde el usuario decide si envia. El ajuste vive en
   * Ajustes, lejos de aqui, y por eso nadie lo noto.
   */
  const [clienteWhatsApp, setClienteWhatsApp] = useState<'web' | 'app'>('web');

  useEffect(() => {
    getSettings().then((s) => setClienteWhatsApp(s.whatsappClientPreference || 'web'));
  }, []);

  useEffect(() => {
    sesion.recordar({
      categoriaId: catId,
      plantillaId: selectedTemplate ? String(selectedTemplate.id) : null,
    });
    // `sesion.recordar` es estable por canal; incluirla no aporta y obligaria
    // a memoizar el objeto entero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomBody(selectedTemplate.contenido || '');
      // El motivo por defecto de la plantilla viene puesto; se puede cambiar.
      setMotivoId(selectedTemplate.defaultReasonId ?? null);
    } else {
      setSentLog([]);
      setCustomBody('');
      setMotivoId(null);
    }
  }, [selectedTemplate]);

  const usaMotivo = /\{motivo\}/i.test(customBody);
  const motivoTexto = reasons.find((reason) => reason.id === motivoId)?.text;

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  /*
   * El filtro por canal se aplica tambien aqui, no solo en la lista.
   *
   * Marcar una lista anadia todos sus leads directamente al envio, sin pasar
   * por la lista de la pantalla: una lista de mil contactos metia a los que no
   * tenian el dato del canal, y el envio salia con destinatarios que no podian
   * recibirlo. Filtrar en el selector no bastaba porque ese camino lo esquiva.
   */
  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!) && puedeRecibirPor(l, 'whatsapp'));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead
  useEffect(() => {
    const primero = recipients[0];
    if (primero && !previewLead) {
      setPreviewLead(primero);
    }
  }, [recipients, previewLead]);

  /*
   * Con un envio en curso, la vista previa deja de ser algo que se elige a
   * mano y pasa a seguir a la cola: lo que se ve es siempre el mensaje del
   * destinatario que toca. Ese desplegable se leia como si eligiera a quien
   * escribir, y no elegia nada.
   */
  const leadEnCola = cola.actual?.lead;
  useEffect(() => {
    if (leadEnCola) setPreviewLead(leadEnCola);
  }, [leadEnCola]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id);
      else n.add(id); return n; });
  };
  const toggleList = (id: number) => {
    setSelectedListIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id);
      else n.add(id); return n; });
  };

  const clearRecipients = () => {
    setSelectedLeadIds(new Set());
    setSelectedListIds(new Set());
  };

  /*
   * QUE HACE EL BOTON DEL PIE AHORA MISMO.
   *
   * Nunca esta apagado. Si falta algo, el boton lo dice y al pulsarlo lleva
   * justo ahi: sin plantilla, sube al selector; sin destinatarios, abre la
   * hoja. Un boton muerto no explica nada, y lo que falta se pide arriba, fuera
   * de la vista.
   */
  const razonPendiente: SendActionState['razonPendiente'] = !selectedTemplate
    ? 'plantilla'
    : recipients.length === 0
      ? 'destinatarios'
      : null;

  const preConfirmSend = () => {
    if (!selectedTemplate) {
      plantillaRef.current?.scrollIntoView({ block: 'nearest' });
      plantillaRef.current?.querySelector('select')?.focus();
      return;
    }
    if (recipients.length === 0) {
      setShowRecipients(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const etiquetaAccion =
    razonPendiente === 'plantilla'
      ? 'Elegí una plantilla'
      : razonPendiente === 'destinatarios'
        ? 'Elegí destinatarios'
        : `Abrir WhatsApp para ${recipients.length} lead${recipients.length === 1 ? '' : 's'}`;

  /*
   * Las dependencias son primitivas a proposito. `onTrigger` cambia de
   * identidad en cada render -es una funcion nueva- y ponerla aca dispararia el
   * efecto sin parar. Lo que importa es que el pie tenga el handler del render
   * actual, y eso ya pasa porque el efecto corre despues de cada cambio real.
   */
  useSendAction(onActionChange, etiquetaAccion, razonPendiente, preConfirmSend);

  const executeSend = async () => {
    setShowConfirmModal(false);
    if (!selectedTemplate || recipients.length === 0) return;

    // Se resuelve una sola vez: lo que se guarda en el historial y lo que se
    // abre en WhatsApp tienen que ser el mismo texto, no dos resoluciones. La
    // plantilla se anota junto a los mensajes, por el mismo motivo.
    plantillaDeLaTanda.current = {
      id: selectedTemplate.id!,
      nombre: selectedTemplate.nombre,
    };
    await cola.iniciar(buildLeadMessages(recipients, customBody, motivoTexto));
  };

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      <div ref={plantillaRef}>
      <SendStep
        title="Plantilla"
        actions={
          <>
            {/* Cuantos van hoy por este canal. Sale de `send_logs`, no de un
                contador en memoria: entre envio y envio el panel se cierra. */}
            {sesion.enviadosHoy > 0 && (
              <Badge tone="success" className="tabular-nums">
                Hoy: {sesion.enviadosHoy}
              </Badge>
            )}
            <SendHistoryDisclosure log={sentLog} templateName={selectedTemplate?.nombre} />
          </>
        }
      >
        <TemplatePicker
          templates={templates}
          templateLists={templateLists}
          categoryId={catId}
          onCategoryChange={setCatId}
          selectedId={String(selectedTemplate?.id ?? '')}
          onSelect={setSelectedTemplate}
        />
      </SendStep>
      </div>

      <WhatsAppQueuePanel cola={cola} />

      {selectedTemplate ? (
        <SendStep title="Mensaje">
          <div className="flex flex-col gap-2.5">
            {usaMotivo && (
              <Field
                label="Motivo del mensaje"
                hint={
                  reasons.length === 0
                    ? 'No hay motivos todavia. Crealos en Plantillas, con "Gestionar motivos".'
                    : 'Sustituye a {motivo}. Es el mismo para todo este envio.'
                }
              >
                <ReasonPicker
                  motivos={reasons}
                  seleccionado={motivoId}
                  onSeleccionar={setMotivoId}
                />
              </Field>
            )}

            <Field
              label="Contenido (edición temporal)"
              hint="Los cambios aplican solo a este envío, la plantilla no se modifica."
              action={
                <VariableDropdown
                  onSelect={(val: string) => insertTextAtCursor(bodyRef, customBody, val, setCustomBody)}
                />
              }
            >
              <Textarea
                ref={bodyRef}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={5}
              />
            </Field>

            <Field
              label={cola.activa ? 'Enviando a' : 'Previsualizar con'}
              hint={
                cola.activa
                  ? undefined
                  : 'Solo cambia el ejemplo que se ve acá. Los destinatarios se eligen abajo.'
              }
              action={
                <Select
                  value={previewLead?.id ?? ''}
                  onChange={(e) => setPreviewLead(leads.find((l) => l.id === e.target.value) || null)}
                  fullWidth={false}
                  compact
                  disabled={cola.activa}
                  className="max-w-[140px]"
                >
                  <option value="">Elegir lead...</option>
                  {recipients.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              }
            >
              <div
                className="max-h-32 overflow-y-auto rounded-md border border-line p-2"
                style={{ backgroundColor: WHATSAPP_CANVAS }}
              >
                {/* Sin destinatario elegido se usa uno de ejemplo, en vez de no
                    mostrar nada. La vista previa es donde se lee el motivo ya
                    sustituido en la frase, asi que tiene que servir desde el
                    primer momento y no solo despues de elegir a quien escribir. */}
                <div className="inline-block max-w-[90%] whitespace-pre-wrap rounded-lg bg-surface p-2 text-micro text-slate-900 shadow-sm">
                  {buildLeadMessages([previewLead ?? LEAD_DE_EJEMPLO], customBody, motivoTexto)[0]?.message}
                </div>
                {!previewLead && (
                  <p className="mt-1.5 text-center text-micro text-ink-secondary">
                    Con datos de ejemplo. Elegí un destinatario para ver el suyo.
                  </p>
                )}
              </div>
            </Field>
          </div>
        </SendStep>
      ) : (
        <SendRequisito title="Mensaje" requisito="Elegí una plantilla para escribir el mensaje." />
      )}

      <RecipientSummaryRow
        count={recipients.length}
        names={recipients.map((lead) => lead.name)}
        onOpen={() => setShowRecipients(true)}
      />

      {showRecipients && (
        <RecipientSheet
          leads={leads}
          leadLists={leadLists}
          selectedLeadIds={selectedLeadIds}
          selectedListIds={selectedListIds}
          onToggleLead={toggleLead}
          onToggleList={toggleList}
          onClear={clearRecipients}
          search={navegacion.search}
          onSearchChange={navegacion.setSearch}
          pagina={navegacion.pagina}
          onPaginaChange={navegacion.setPagina}
          ocultarSinNombre={navegacion.ocultarSinNombre}
          onOcultarSinNombreChange={navegacion.setOcultarSinNombre}
          sentLeadIds={sentLeadIds}
          plantillas={templates}
          categorias={templateLists}
          canal="whatsapp"
          count={recipients.length}
          onClose={() => setShowRecipients(false)}
        />
      )}

      {showConfirmModal && selectedTemplate && (
        <SendConfirmModal
          title="Confirmar envío"
          // El modal decia "se abrira WhatsApp" sin mas, y con varios
          // destinatarios eso daba a entender que salian todos de una vez.
          subtitle={
            recipients.length === 1
              ? clienteWhatsApp === 'app'
                ? 'Se abrirá la app de escritorio de WhatsApp para completar el envío.'
                : 'Se abrirá WhatsApp Web para completar el envío.'
              : `Se abrirá el chat del primero. Los otros ${recipients.length - 1} van de a uno, avanzando desde acá.`
          }
          confirmLabel={recipients.length === 1 ? 'Abrir WhatsApp' : 'Empezar por el primero'}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={executeSend}
          rows={[
            { label: 'Plantilla', value: selectedTemplate.nombre },
            {
              label: `Destinatarios (${recipients.length})`,
              value: <RecipientSummary names={recipients.map((r) => r.name)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
