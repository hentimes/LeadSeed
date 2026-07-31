import re

with open('src/components/leads/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'\n  return \(\r?\n', content)

if not match:
    print("Could not find return statement")
    exit(1)

start_idx = match.start() + 1 

new_return = """  const STEP1_MOTIVO_LABELS: Record<string, string> = {
    'invertir': 'Invertir',
    'vivir': 'Vivir'
  };

  const STEP1_NECESIDAD_LABELS: Record<string, string> = {
    'rentabilidad': 'Rentabilidad',
    'patrimonio': 'Patrimonio',
    'seguridad': 'Seguridad',
    'independencia': 'Independencia'
  };

  const STEP1_OBJETIVO_LABELS: Record<string, string> = {
    'corto_plazo': 'Corto plazo',
    'largo_plazo': 'Largo plazo',
    'jubilacion': 'Jubilación'
  };

  const toJourneyLabel = (val: string, labels: Record<string, string>) => labels[val] || val;
  
  const journey = (planesproDetails as any)?.journey;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-[#F8FAFC] border border-[#E6EAF0] rounded-[16px] shadow-2xl w-full max-w-[680px] max-h-[90vh] flex flex-col mx-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-[#E6EAF0] shrink-0 bg-white rounded-t-[16px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F2EEFF] text-[#6C4CF6] flex items-center justify-center font-bold text-lg shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${STATUS_COLORS[lead.status || 'nuevo']}15`, color: STATUS_COLORS[lead.status || 'nuevo'] }}
              >
                {STATUS_LABELS[lead.status || 'nuevo']}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const text = [
                  `Nombre: ${lead.name}`,
                  lead.phone ? `Teléfono: ${lead.phone}` : '',
                  lead.email ? `Email: ${lead.email}` : '',
                  lead.company ? `Empresa: ${lead.company}` : '',
                  lead.rut ? `RUT: ${lead.rut}` : '',
                ].filter(Boolean).join('\\n');
                navigator.clipboard.writeText(text);
                const button = document.getElementById('copy-btn-2');
                if (button) {
                  const previous = button.innerHTML;
                  button.innerHTML = '<span class="text-emerald-600">Copiado</span>';
                  setTimeout(() => { button.innerHTML = previous; }, 2000);
                }
              }}
              id="copy-btn-2"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E6EAF0] text-[13px] font-medium text-slate-600 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <span className="text-slate-500">{Icon.Copy()}</span> Copiar
            </button>
            <button
              onClick={() => { onEdit(lead); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E6EAF0] text-[13px] font-medium text-slate-600 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <span className="text-slate-500">{Icon.Edit()}</span> Editar
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors ml-1 rounded-full hover:bg-gray-100">
              {Icon.Close()}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {crossExecAlerts.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-[12px] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                <span className="text-amber-600">{Icon.Warning()}</span> Seguimiento comercial
              </div>
              <div className="space-y-1.5">
                {crossExecAlerts.map((event) => (
                  <div key={event.id} className="text-xs text-amber-900 leading-relaxed">
                    {getCrossExecMessage(event)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E6EAF0] rounded-[12px] p-4 flex">
            <div className="flex-1 flex gap-3 items-center border-r border-[#E6EAF0] px-4 first:pl-0">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                {Icon.Calendar()}
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Ingreso</p>
                <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
            </div>
            <div className="flex-1 flex gap-3 items-center border-r border-[#E6EAF0] px-4">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                {Icon.Layers()}
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Formulario</p>
                <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{planesproDetails.sistema || 'PlanesPro'}</p>
              </div>
            </div>
            <div className="flex-1 flex gap-3 items-center px-4 last:pr-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[lead.status || 'nuevo'] }}></div>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Estado</p>
                <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{STATUS_LABELS[lead.status || 'nuevo']}</p>
              </div>
            </div>
          </div>

          {(isPlanesproLead || journey) && (
            <div className="bg-white border border-[#E6EAF0] rounded-[12px] overflow-hidden shadow-sm">
              <div className="w-full flex items-center justify-between p-4 bg-white border-b border-[#E6EAF0]">
                <span className="font-bold text-slate-800 text-[15px]">Revisión PlanesPro</span>
                <span className="text-slate-400">
                  {Icon.ChevronDown()}
                </span>
              </div>
              
              <div className="p-5">
                {journey && (
                  <div className="grid grid-cols-[1fr_1fr] gap-6 mb-6">
                    <div className="space-y-6 relative ml-1">
                      <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-[#F2EEFF] -z-10"></div>
                      
                      {journey.motivo && (
                        <div className="flex gap-4 relative">
                          <div className="w-6 h-6 rounded-full bg-[#F2EEFF] text-[#6C4CF6] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 outline outline-4 outline-white">1</div>
                          <div>
                            <p className="text-[11px] text-slate-500 font-medium mb-1">Paso 1 · Motivo</p>
                            <p className="text-[13px] font-semibold text-slate-800 leading-snug">{toJourneyLabel(journey.motivo, STEP1_MOTIVO_LABELS)}</p>
                          </div>
                        </div>
                      )}
                      
                      {journey.necesidad && (
                        <div className="flex gap-4 relative">
                          <div className="w-6 h-6 rounded-full bg-[#F2EEFF] text-[#6C4CF6] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 outline outline-4 outline-white">2</div>
                          <div>
                            <p className="text-[11px] text-slate-500 font-medium mb-1">Paso 2 · Necesidad</p>
                            <p className="text-[13px] font-semibold text-slate-800 leading-snug">{toJourneyLabel(journey.necesidad, STEP1_NECESIDAD_LABELS)}</p>
                          </div>
                        </div>
                      )}

                      {journey.objetivo && (
                        <div className="flex gap-4 relative">
                          <div className="w-6 h-6 rounded-full bg-[#F2EEFF] text-[#6C4CF6] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 outline outline-4 outline-white">3</div>
                          <div>
                            <p className="text-[11px] text-slate-500 font-medium mb-1">Paso 3 · Objetivo</p>
                            <p className="text-[13px] font-semibold text-slate-800 leading-snug">{toJourneyLabel(journey.objetivo, STEP1_OBJETIVO_LABELS)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {journey.resumen && (
                      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[12px] p-5 flex flex-col justify-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-emerald-700 text-[13px]">Resumen de intención</span>
                          <span className="text-emerald-600">{Icon.CheckCircle()}</span>
                        </div>
                        <p className="text-[13px] text-emerald-800 leading-relaxed font-medium">
                          {journey.resumen}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className={`grid grid-cols-2 gap-y-5 gap-x-6 ${journey ? 'pt-5 border-t border-dashed border-[#E6EAF0]' : ''}`}>
                  {planesproDetails.rangoEdad && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                        {Icon.User()}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Edad</p>
                        <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{planesproDetails.rangoEdad}</p>
                      </div>
                    </div>
                  )}
                  {planesproDetails.rangoRenta && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                        {Icon.Database()}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Renta</p>
                        <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{planesproDetails.rangoRenta}</p>
                      </div>
                    </div>
                  )}
                  {planesproDetails.comuna && (
                    <div className="flex items-start gap-3 border-t border-dashed border-[#E6EAF0] pt-5">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                        {Icon.Bullseye()}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Comuna</p>
                        <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{planesproDetails.comuna}</p>
                      </div>
                    </div>
                  )}
                  {planesproDetails.contacto && (
                    <div className="flex items-start gap-3 border-t border-dashed border-[#E6EAF0] pt-5">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                        {Icon.Phone()}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Contacto</p>
                        <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{CONTACT_PREFERENCE_LABELS[planesproDetails.contacto] || planesproDetails.contacto}</p>
                      </div>
                    </div>
                  )}
                  
                  {planesproDetails.comentario && (
                    <div className="col-span-2 flex items-start gap-3 border-t border-dashed border-[#E6EAF0] pt-5">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-slate-400">
                        {Icon.Messages()}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">Comentario</p>
                        <p className="text-[13px] font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap">{planesproDetails.comentario}</p>
                      </div>
                    </div>
                  )}
                </div>

                {(planesproMetadata.pdf_path || pdfLoading || pdfError) && (
                  <div className="mt-5 pt-5 border-t border-dashed border-[#E6EAF0]">
                    <p className="text-[11px] text-slate-500 font-medium mb-2">Adjunto PDF</p>
                    <div className="flex items-center gap-2">
                      {planesproMetadata.pdf_path ? (
                        <>
                          <button onClick={() => { void submitPdfRequest(false); }} className="px-3 py-1.5 border border-[#E6EAF0] rounded-[8px] text-[12px] font-medium text-slate-600 hover:bg-gray-50 bg-white shadow-sm transition-colors">
                            Ver PDF
                          </button>
                          <button onClick={() => { void submitPdfRequest(true); }} className="px-3 py-1.5 border border-[#E6EAF0] rounded-[8px] text-[12px] font-medium text-slate-600 hover:bg-gray-50 bg-white shadow-sm transition-colors">
                            Descargar
                          </button>
                        </>
                      ) : (
                        <span className="text-[12px] text-slate-500">{pdfLoading ? 'Preparando vista...' : pdfError || 'Sin acceso'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E6EAF0] rounded-[12px] overflow-hidden shadow-sm">
            <div className="w-full flex items-center justify-between p-4 bg-white border-b border-[#E6EAF0]">
              <span className="font-bold text-slate-800 text-[15px]">Agenda</span>
              <span className="text-slate-400">
                {Icon.ChevronDown()}
              </span>
            </div>
            <div className="p-4">
              {!canCreateAppointment ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-slate-600">Este lead ya tiene una cita activa.</p>
                  <div className="flex gap-2">
                    {visibleMeetLink && (
                      <button onClick={() => openMeetLink(visibleMeetLink)} className="px-4 py-2 bg-white border border-[#E6EAF0] rounded-[8px] text-[13px] font-medium text-slate-700 shadow-sm hover:bg-gray-50 transition-colors">Abrir Meet</button>
                    )}
                    {onNavigate && (
                      <button onClick={() => { openAgendaAppointment(activeAppointment?.id); onClose(); onNavigate('agenda'); }} className="px-4 py-2 bg-white border border-[#E6EAF0] rounded-[8px] text-[13px] font-medium text-slate-700 shadow-sm hover:bg-gray-50 transition-colors">Gestionar cita</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.Calendar()}</div>
                    <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-[#E6EAF0] rounded-[8px] text-[13px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6]" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.History()}</div>
                    <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-[#E6EAF0] rounded-[8px] text-[13px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6]" />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={appointmentNote} onChange={(e) => setAppointmentNote(e.target.value)} placeholder="Notas de la cita..." className="flex-1 px-3 py-2 border border-[#E6EAF0] rounded-[8px] text-[13px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6]" />
                    <button onClick={() => { void handleCreateAppointment(); }} disabled={appointmentLoading} className="px-4 py-2 bg-[#421DD8] hover:bg-[#3416AB] text-white text-[13px] font-medium rounded-[8px] transition-colors whitespace-nowrap disabled:opacity-60 shadow-sm">
                      {appointmentLoading ? '...' : 'Agendar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E6EAF0] rounded-[12px] p-4 space-y-3 shadow-sm">
            <span className="font-bold text-slate-800 text-[15px]">Nota interna</span>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Agregar nota..." 
                className="flex-1 px-3 py-2 border border-[#E6EAF0] rounded-[8px] text-[13px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6]" 
              />
              <button onClick={addNote} className="px-6 py-2 bg-[#421DD8] hover:bg-[#3416AB] text-white text-[13px] font-medium rounded-[8px] transition-colors shadow-sm">
                Guardar
              </button>
            </div>
          </div>

          <button onClick={() => setShowNotes(!showNotes)} className="w-full flex items-center justify-between p-4 bg-white border border-[#E6EAF0] rounded-[12px] hover:bg-gray-50 transition-colors shadow-sm">
            <span className="font-bold text-slate-800 text-[15px]">Historial de notas ({(notes?.length || 0) + (lead.notes && !isPlanesproLead ? 1 : 0)})</span>
            <span className="text-slate-400">
              {showNotes ? Icon.ChevronDown() : Icon.ChevronRight()}
            </span>
          </button>
          
          {showNotes && (
            <div className="bg-white border border-[#E6EAF0] rounded-[12px] p-4 space-y-3 shadow-sm">
              {notes.length === 0 && (!lead.notes || isPlanesproLead) && (
                <p className="text-[13px] text-gray-400">Sin notas todavia.</p>
              )}
              {lead.notes && !isPlanesproLead && (
                <div className="border-l-[3px] border-[#6C4CF6] pl-4 py-1">
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Nota original</p>
                </div>
              )}
              {notes.map((note) => (
                <div key={note.id} className="border-l-[3px] border-[#6C4CF6] pl-4 py-1">
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{new Date(note.createdAt).toLocaleString('es-CL')}</p>
                </div>
              ))}
            </div>
          )}

          {sendLogs.length > 0 && (
            <>
              <button onClick={() => setShowLogs(!showLogs)} className="w-full flex items-center justify-between p-4 bg-white border border-[#E6EAF0] rounded-[12px] hover:bg-gray-50 transition-colors shadow-sm">
                <span className="font-bold text-slate-800 text-[15px]">Historial de envíos ({sendLogs.length})</span>
                <span className="text-slate-400">
                  {showLogs ? Icon.ChevronDown() : Icon.ChevronRight()}
                </span>
              </button>
              
              {showLogs && (
                <div className="bg-white border border-[#E6EAF0] rounded-[12px] p-4 space-y-3 shadow-sm">
                  {sendLogs.map((log) => {
                    const templateName = getTemplateName(log.templateId as any, log.templateType);
                    const hasContent = templateName !== '?';
                    const isExpanded = expandedLogId === log.id;

                    let templateContent = '';
                    if (log.templateType === 'whatsapp') {
                      templateContent = waTemplates.find((template) => template.id === log.templateId)?.contenido || '';
                    } else {
                      const emailTemplate = emailTemplates.find((template) => template.id === log.templateId);
                      templateContent = emailTemplate?.contenido || '';
                    }

                    return (
                      <div key={log.id} className="border-b border-[#E6EAF0] last:border-0 pb-3 last:pb-0">
                        <div className="text-[13px] flex items-center gap-2">
                          <span className={log.templateType === 'whatsapp' ? 'text-emerald-500' : 'text-blue-500'}>
                            {log.templateType === 'whatsapp' ? Icon.Send() : Icon.Email()}
                          </span>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id!)}
                            className={`text-left font-medium ${hasContent ? 'text-[#6C4CF6] hover:underline' : 'text-slate-500 cursor-default'}`}
                            disabled={!hasContent}
                          >
                            {templateName}
                          </button>
                          <span className="text-[11px] text-slate-400 ml-auto">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                        </div>
                        {isExpanded && templateContent && (
                          <div className="mt-2 p-3 bg-gray-50 border border-[#E6EAF0] rounded-[8px] text-[12px] text-slate-700 max-h-32 overflow-y-auto">
                            {log.templateType === 'email' && emailTemplates.find((template) => template.id === log.templateId)?.isHtml ? (
                              <div dangerouslySetInnerHTML={{ __html: templateContent }} />
                            ) : (
                              <div className="whitespace-pre-wrap">{templateContent}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {genericMetadataEntries.length > 0 && (
            <div className="bg-white border border-[#E6EAF0] rounded-[12px] p-4 shadow-sm">
              <p className="text-[13px] font-bold text-slate-800 mb-3">Información adicional</p>
              <div className="space-y-2">
                {genericMetadataEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-[#E6EAF0] last:border-0 pb-2 last:pb-0 gap-2">
                    <span className="text-[12px] font-medium text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-[12px] text-slate-800 font-semibold text-right break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
"""

with open('src/components/leads/LeadDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content[:start_idx] + new_return)

print("Replaced successfully")
