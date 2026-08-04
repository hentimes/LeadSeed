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
import { SendTabs } from '../components/send/SendTabs';
import type { SendChannel } from '../components/send/channels';

export default function SendPage() {
  const [tab, setTab] = useState<SendChannel>('whatsapp');
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
    <div className="flex w-full flex-col">
      <SendTabs active={tab} onChange={setTab} />

      <div className="mt-3">
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
    </div>
  );
}
