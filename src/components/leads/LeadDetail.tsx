import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Lead, LeadNote, LeadList, SendLog, WhatsAppTemplate, EmailTemplate } from '../../types';
import { STATUS_LABELS, STATUS_COLORS } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  lead: Lead;
  lists: LeadList[];
  onClose: () => void;
  onEdit: (lead: Lead) => void;
}

export default function LeadDetail({ lead, lists, onClose, onEdit }: Props) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    (async () => {
      const [
        { data: notesData },
        { data: logsData },
        { data: waData },
        { data: emailData }
      ] = await Promise.all([
        supabase.from('lead_notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
        supabase.from('send_logs').select('*').eq('lead_id', lead.id).order('sent_at', { ascending: false }),
        supabase.from('templates').select('*').eq('type', 'whatsapp'),
        supabase.from('templates').select('*').eq('type', 'email'),
      ]);
      
      setNotes((notesData || []).map(n => ({ id: n.id, leadId: n.lead_id, content: n.content, createdAt: n.created_at })));
      setSendLogs((logsData || []).map(l => ({ id: l.id, templateId: l.template_id, templateType: l.template_type, leadId: l.lead_id, leadName: l.lead_name, leadPhone: l.lead_phone, sentAt: l.sent_at, scheduledFor: l.scheduled_for })));
      setWaTemplates((waData || []).map(t => ({ id: t.id, nombre: t.name, contenido: t.content, templateListIds: t.template_list_ids || [] } as any)));
      setEmailTemplates((emailData || []).map(t => ({ id: t.id, nombre: t.name, asunto: t.subject, contenido: t.content, isHtml: t.is_html, templateListIds: t.template_list_ids || [] } as any)));
    })();
  }, [lead.id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: session } = await supabase.auth.getSession();
    await supabase.from('lead_notes').insert({
      lead_id: lead.id,
      user_id: session?.session?.user?.id,
      content: newNote.trim()
    });
    setNewNote('');
    const { data } = await supabase.from('lead_notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false });
    setNotes((data || []).map(n => ({ id: n.id, leadId: n.lead_id, content: n.content, createdAt: n.created_at })));
  };

  const getTemplateName = (templateId: number, type: string) => {
    if (type === 'whatsapp') return waTemplates.find((t) => t.id === templateId)?.nombre || '?';
    return emailTemplates.find((t) => t.id === templateId)?.nombre || '?';
  };

  const leadLists = lists.filter((l) => lead.listaIds?.includes(l.id!));

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-4 overflow-hidden">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[92%] max-w-[340px] max-h-[90vh] flex flex-col mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold">{lead.name}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: STATUS_COLORS[lead.status || 'nuevo'] }}>
              {STATUS_LABELS[lead.status || 'nuevo']}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const text = [
                `Nombre: ${lead.name}`,
                lead.phone ? `Teléfono: ${lead.phone}` : '',
                lead.email ? `Email: ${lead.email}` : '',
                lead.company ? `Empresa: ${lead.company}` : '',
                lead.rut ? `RUT: ${lead.rut}` : ''
              ].filter(Boolean).join('\n');
              navigator.clipboard.writeText(text);
              const btn = document.getElementById('copy-btn');
              if(btn) {
                const old = btn.innerHTML;
                btn.innerHTML = '¡Copiado!';
                setTimeout(() => btn.innerHTML = old, 2000);
              }
            }} id="copy-btn" className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"><Icon.Copy /> Copiar</button>
            <button onClick={() => { onEdit(lead); onClose(); }} className="text-blue-600 hover:text-blue-800 text-sm">{Icon.Edit()} Editar</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.phone && <div><span className="text-gray-500 text-xs">Teléfono</span><p>{lead.phone}</p></div>}
            {lead.email && <div><span className="text-gray-500 text-xs">Email</span><p className="text-blue-600">{lead.email}</p></div>}
            {lead.company && <div><span className="text-gray-500 text-xs">Empresa</span><p>{lead.company}</p></div>}
            {lead.rut && <div><span className="text-gray-500 text-xs">RUT</span><p className="font-mono">{lead.rut}</p></div>}
            <div><span className="text-gray-500 text-xs">Ingreso</span><p>{new Date(lead.createdAt).toLocaleDateString('es-CL')}</p></div>
            <div><span className="text-gray-500 text-xs">Actualizado</span><p>{new Date(lead.updatedAt).toLocaleDateString('es-CL')}</p></div>
          </div>

          {/* Renderizar Metadata (Campos Dinámicos) */}
          {lead.metadata && Object.keys(lead.metadata).length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Información Adicional</p>
              <div className="bg-blue-50/50 rounded-md p-2 space-y-1.5 border border-blue-100">
                {Object.entries(lead.metadata).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center border-b border-blue-100/50 last:border-0 pb-1 last:pb-0">
                    <span className="text-xs font-medium text-blue-800 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-blue-900 font-semibold text-right">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notas actuales</p>
              <p className="text-sm bg-gray-50 rounded p-2 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {leadLists.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Listas</p>
              <div className="flex flex-wrap gap-1">
                {leadLists.map((l) => (
                  <span key={l.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: l.color }}>{l.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Add note (Movido aquí) */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Agregar nota..."
              className="flex-1 border rounded px-2 py-1.5 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <button onClick={addNote} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700">
              Guardar
            </button>
          </div>

          {/* Notas - timeline (Acordeón) */}
          <div>
            <button onClick={() => setShowNotes(!showNotes)} className="w-full flex justify-between items-center text-xs font-medium text-gray-700 mb-2 border-b pb-1 hover:text-blue-600">
              <span>Historial de notas ({notes.length + (lead.notes ? 1 : 0)})</span>
              <span>{showNotes ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
            </button>
            {showNotes && (
              <>
                {notes.length === 0 && !lead.notes && (
                  <p className="text-xs text-gray-400">Sin notas todavía.</p>
                )}
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-blue-300 pl-3">
                      <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(note.createdAt).toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Historial de envíos (Acordeón) */}
          {sendLogs.length > 0 && (
            <div>
              <button onClick={() => setShowLogs(!showLogs)} className="w-full flex justify-between items-center text-xs font-medium text-gray-700 mb-2 border-b pb-1 hover:text-blue-600">
                <span>Historial de envíos ({sendLogs.length})</span>
                <span>{showLogs ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
              </button>
              {showLogs && (
                <div className="space-y-1">
                  {sendLogs.map((log) => {
                    const tplName = getTemplateName(log.templateId as any, log.templateType);
                    const hasContent = tplName !== '?';
                    const isExpanded = expandedLogId === log.id;
                    let tplContent = '';
                    if (log.templateType === 'whatsapp') {
                      tplContent = waTemplates.find((t) => t.id === log.templateId)?.contenido || '';
                    } else {
                      const et = emailTemplates.find((t) => t.id === log.templateId);
                      tplContent = et?.contenido || '';
                    }
                    return (
                      <div key={log.id}>
                        <div className="text-xs flex items-center gap-2">
                          <span className={log.templateType === 'whatsapp' ? 'text-green-600' : 'text-blue-600'}>
                            {log.templateType === 'whatsapp' ? <span className="text-green-500">{Icon.Send()}</span> : <span className="text-blue-500">{Icon.Email()}</span>}
                          </span>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id!)}
                            className={`text-left ${hasContent ? 'text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2' : 'text-gray-600 cursor-default'}`}
                            disabled={!hasContent}
                          >
                            {tplName}
                          </button>
                          <span className="text-gray-400 ml-auto">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                        </div>
                        {isExpanded && tplContent && (
                          <div className="mt-1 mb-2 p-2 bg-gray-50 border rounded text-xs max-h-32 overflow-y-auto">
                            {log.templateType === 'email' && emailTemplates.find((t) => t.id === log.templateId)?.isHtml ? (
                              <div dangerouslySetInnerHTML={{ __html: tplContent }} />
                            ) : (
                              <div className="whitespace-pre-wrap">{tplContent}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
