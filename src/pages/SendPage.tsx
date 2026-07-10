import { useEffect, useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import {
  useWhatsAppTemplates,
  useWhatsAppTemplateLists,
  useEmailTemplates,
  useEmailTemplateLists,
} from '../hooks/useTemplates';
import type {
  Lead,
  LeadList,
  WhatsAppTemplate,
  WhatsAppTemplateList,
  EmailTemplate,
  EmailTemplateList,
} from '../types';
import WhatsAppSender from '../components/WhatsAppSender';
import EmailSender from '../components/EmailSender';

type Tab = 'whatsapp' | 'email';

export default function SendPage() {
  const [tab, setTab] = useState<Tab>('whatsapp');
  const { getAll } = useLeads();
  const { getAll: getLeadLists } = useLists();
  const waTemplates = useWhatsAppTemplates();
  const waLists = useWhatsAppTemplateLists();
  const emailTemplates = useEmailTemplates();
  const emailLists = useEmailTemplateLists();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [waData, setWaData] = useState<WhatsAppTemplate[]>([]);
  const [waListData, setWaListData] = useState<WhatsAppTemplateList[]>([]);
  const [emailData, setEmailData] = useState<EmailTemplate[]>([]);
  const [emailListData, setEmailListData] = useState<EmailTemplateList[]>([]);

  const load = async () => {
    setLeads(await getAll());
    setLeadLists(await getLeadLists());
    setWaData(await waTemplates.getAll());
    setWaListData(await waLists.getAll());
    setEmailData(await emailTemplates.getAll());
    setEmailListData(await emailLists.getAll());
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Enviar Mensajes</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('whatsapp')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setTab('email')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Email
        </button>
      </div>

      {tab === 'whatsapp' ? (
        <WhatsAppSender
          leads={leads}
          templates={waData}
          templateLists={waListData}
          leadLists={leadLists}
        />
      ) : (
        <EmailSender
          leads={leads}
          templates={emailData}
          templateLists={emailListData}
          leadLists={leadLists}
        />
      )}
    </div>
  );
}
