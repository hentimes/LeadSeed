import { useEffect, useState } from 'react';
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
import WhatsAppSender from '../components/send/WhatsAppSender';
import EmailSender from '../components/send/EmailSender';
import CallSender from '../components/send/CallSender';
import { Icon } from '../utils/icons';

type Tab = 'whatsapp' | 'email' | 'call';

export default function SendPage() {
  const [tab, setTab] = useState<Tab>('whatsapp');
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

  const load = async () => {
    setLeads(await getAll());
    setLeadLists(await getLeadLists());
    setWaData(await waTemplates.getAll());
    setWaListData(await waLists.getAll());
    setEmailData(await emailTemplates.getAll());
    setEmailListData(await emailLists.getAll());
    setCallData(await callTemplates.getAll());
    setCallListData(await callLists.getAll());
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Enviar Mensajes</h2>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('whatsapp')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'whatsapp' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:bg-white/50'
          }`}
        >
          <Icon.Messages /> WhatsApp
        </button>
        <button
          onClick={() => setTab('email')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'email' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-white/50'
          }`}
        >
          <Icon.Email /> Email
        </button>
        <button
          onClick={() => setTab('call')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'call' ? 'bg-white shadow text-amber-700' : 'text-gray-600 hover:bg-white/50'
          }`}
        >
          <Icon.Phone /> Llamadas
        </button>
      </div>

      {tab === 'whatsapp' && (
        <WhatsAppSender
          leads={leads}
          templates={waData}
          templateLists={waListData}
          leadLists={leadLists}
        />
      )}

      {tab === 'email' && (
        <EmailSender
          leads={leads}
          templates={emailData}
          templateLists={emailListData}
          leadLists={leadLists}
        />
      )}

      {tab === 'call' && (
        <CallSender
          leads={leads}
          templates={callData}
          templateLists={callListData}
          leadLists={leadLists}
        />
      )}
    </div>
  );
}
