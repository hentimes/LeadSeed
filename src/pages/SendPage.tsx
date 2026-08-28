import { useCallback, useEffect, useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import {
  useWhatsAppTemplates,
  useWhatsAppTemplateLists,
  useEmailTemplates,
  useEmailTemplateLists,
  useCallTemplates,
  useCallTemplateLists,
} from '../hooks/useTemplates';
import type {
  Lead,
  LeadList,
  WhatsAppTemplate,
  WhatsAppTemplateList,
  EmailTemplate,
  EmailTemplateList,
  CallTemplate,
  CallTemplateList,
} from '../types';
import { LoadError, Skeleton } from '../design';
import WhatsAppSender from '../components/send/WhatsAppSender';
import EmailSender from '../components/send/EmailSender';
import CallSender from '../components/send/CallSender';
import { SendTabs } from '../components/send/SendTabs';
import { SendActionBar } from '../components/send/SendActionBar';
import type { SendChannel, SendActionState } from '../components/send/channels';

/** Lo que se ve mientras cargan los catalogos. */
function SendSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-md border border-line bg-surface p-3">
          <Skeleton width="38%" height="11px" />
          <Skeleton shape="block" height="34px" />
        </div>
      ))}
    </div>
  );
}

export default function SendPage() {
  const [tab, setTab] = useState<SendChannel>('whatsapp');

  /*
   * Como se ve el boton del pie en cada canal.
   *
   * Los tres senders quedan montados a la vez -es lo que evita perder el
   * trabajo al cambiar de pestana-, asi que los tres reportan su accion y aca
   * solo se pinta la del canal activo. El estado de cada canal (plantilla,
   * cuerpo, destinatarios) NO sube: sube este resumen de tres campos.
   */
  const [acciones, setAcciones] = useState<Record<SendChannel, SendActionState | null>>({
    whatsapp: null,
    email: null,
    call: null,
  });

  const registrarAccion = useCallback((canal: SendChannel, accion: SendActionState) => {
    setAcciones((previas) => ({ ...previas, [canal]: accion }));
  }, []);
  const { getAll } = useLeads();
  const { getAll: getLeadLists } = useLists();
  const waTemplates = useWhatsAppTemplates();
  const waLists = useWhatsAppTemplateLists();
  const emailTemplates = useEmailTemplates();
  const emailLists = useEmailTemplateLists();
  const callTemplates = useCallTemplates();
  const callLists = useCallTemplateLists();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [waData, setWaData] = useState<WhatsAppTemplate[]>([]);
  const [waListData, setWaListData] = useState<WhatsAppTemplateList[]>([]);
  const [emailData, setEmailData] = useState<EmailTemplate[]>([]);
  const [emailListData, setEmailListData] = useState<EmailTemplateList[]>([]);
  const [callData, setCallData] = useState<CallTemplate[]>([]);
  const [callListData, setCallListData] = useState<CallTemplateList[]>([]);

  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  /*
   * Los ocho catalogos se piden EN PARALELO. Eran ocho `await` en fila, o sea
   * ocho viajes de ida y vuelta encadenados antes de pintar nada; ninguno
   * depende del anterior.
   */
  const load = useCallback(async () => {
    setCargando(true);
    setFallo(false);

    try {
      const [
        proximosLeads,
        proximasListas,
        wa,
        waL,
        email,
        emailL,
        call,
        callL,
      ] = await Promise.all([
        getAll(),
        getLeadLists(),
        waTemplates.getAll(),
        waLists.getAll(),
        emailTemplates.getAll(),
        emailLists.getAll(),
        callTemplates.getAll(),
        callLists.getAll(),
      ]);

      setLeads(proximosLeads);
      setLeadLists(proximasListas);
      setWaData(wa);
      setWaListData(waL);
      setEmailData(email);
      setEmailListData(emailL);
      setCallData(call);
      setCallListData(callL);
    } catch (error) {
      // Sin este `catch` la promesa se rechazaba sin manejar y la pantalla
      // quedaba igual que una cuenta nueva: "todavia no tenes nada".
      console.error('[send] no se pudieron cargar los catalogos', error);
      setFallo(true);
    } finally {
      setCargando(false);
    }
    // Los hooks devuelven funciones nuevas en cada render; depender de ellas
    // dispararia la carga en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex w-full flex-col">
      <SendTabs active={tab} onChange={setTab} />

      <div className="mt-3">
        {cargando ? (
          <SendSkeleton />
        ) : fallo ? (
          <LoadError
            title="No pudimos cargar tus plantillas"
            description="Revisá la conexión y volvé a intentar."
            onRetry={() => void load()}
          />
        ) : (
          /*
           * Los tres canales quedan MONTADOS y se oculta el que no toca.
           *
           * Antes se montaban por condicional, asi que cambiar de pestana los
           * desmontaba y con ellos todo su estado. Si habias elegido plantilla,
           * editado el cuerpo y marcado cuarenta destinatarios en WhatsApp,
           * tocar "Email" para consultar algo lo borraba todo, sin aviso y sin
           * vuelta atras. Es la perdida de trabajo mas cara de la seccion.
           *
           * `hidden` y no `display` en linea: es una clase literal y el
           * contenido oculto sale del orden de tabulacion solo.
           */
          <>
            <div className={tab === 'whatsapp' ? '' : 'hidden'}>
              <WhatsAppSender
                leads={leads}
                templates={waData}
                templateLists={waListData}
                leadLists={leadLists}
                onActionChange={(accion) => registrarAccion('whatsapp', accion)}
              />
            </div>

            <div className={tab === 'email' ? '' : 'hidden'}>
              <EmailSender
                leads={leads}
                templates={emailData}
                templateLists={emailListData}
                leadLists={leadLists}
                onActionChange={(accion) => registrarAccion('email', accion)}
              />
            </div>

            <div className={tab === 'call' ? '' : 'hidden'}>
              <CallSender
                leads={leads}
                templates={callData}
                templateLists={callListData}
                leadLists={leadLists}
                onActionChange={(accion) => registrarAccion('call', accion)}
              />
            </div>
          </>
        )}
      </div>

      {/*
        Hueco del alto del pie. El pie es `fixed`, o sea que sale del flujo y no
        empuja nada: sin esta reserva taparia el final del contenido de forma
        permanente, no solo al hacer scroll.
      */}
      {!cargando && !fallo && <div aria-hidden="true" className="h-16" />}

      {!cargando && !fallo && <SendActionBar action={acciones[tab]} />}
    </div>
  );
}
