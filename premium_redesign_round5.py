import re

with open('src/components/leads/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

return_match = re.search(r'\n  return \(\r?\n', content)
if not return_match:
    print("Could not find return statement")
    exit(1)

use_effect_idx = content.find("useEffect(() => {\n    document.body.style.overflow = 'hidden';")
if use_effect_idx != -1:
    start_idx = use_effect_idx - 2
else:
    start_idx = return_match.start()

new_return_and_hooks = """  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Iconos inline
  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );

  const WAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-8 p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-[460px] flex flex-col mx-auto animate-scale-in border border-slate-100 mb-8 relative">
        
        {/* Header (Sin tag nuevo, rut visible, nombre en una linea) */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-100 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-[#F2EEFF] to-[#E0D4FF] text-[#6C4CF6] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate w-full" title={lead.name}>{lead.name}</h2>
              {/* Rut si existe */}
              {!!(lead.documentId || rawPayload.rut || rawPayload.document_id) && (
                <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                  RUT: {lead.documentId || rawPayload.rut || rawPayload.document_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onEdit(lead); onClose(); }} className="p-1.5 text-slate-400 hover:text-[#6C4CF6] hover:bg-[#F2EEFF] rounded-[6px] transition-colors" title="Editar">
              {Icon.Edit()}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors" title="Cerrar">
              {Icon.Close()}
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pt-3 space-y-4">
          
          {/* Quick Actions / Contacto (En una sola linea) */}
          <div className="flex gap-2 w-full">
            {/* Phone Block */}
            {lead.phone && (
              <div className="flex-1 flex gap-1 min-w-0">
                <div 
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] cursor-pointer hover:bg-slate-100 transition-colors group min-w-0"
                  title="Doble clic para copiar"
                  onDoubleClick={() => copyToClipboard(lead.phone)}
                >
                  <span className="text-slate-400 shrink-0">{Icon.Phone()}</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{lead.phone}</span>
                  <span className="ml-auto text-slate-300 group-hover:text-slate-500 shrink-0"><CopyIcon /></span>
                </div>
                <a href={`https://wa.me/${lead.phone.replace(/[^+\\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="WhatsApp">
                  <WAppIcon />
                </a>
                <a href={`tel:${lead.phone.replace(/[^+\\d]/g, '')}`} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="Llamar">
                  {Icon.Phone()}
                </a>
              </div>
            )}
            {/* Email Block */}
            {lead.email && (
              <div className="flex-1 flex gap-1 min-w-0">
                <div 
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] cursor-pointer hover:bg-slate-100 transition-colors group min-w-0"
                  title="Doble clic para copiar"
                  onDoubleClick={() => copyToClipboard(lead.email)}
                >
                  <span className="text-slate-400 shrink-0">{Icon.Email()}</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{lead.email}</span>
                  <span className="ml-auto text-slate-300 group-hover:text-slate-500 shrink-0"><CopyIcon /></span>
                </div>
                <a href={`mailto:${lead.email}`} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-50 text-slate-700 rounded-[6px] hover:bg-[#F2EEFF] hover:text-[#6C4CF6] hover:border-[#E0D4FF] transition-colors border border-slate-200" title="Enviar correo">
                  {Icon.Email()}
                </a>
              </div>
            )}
          </div>

          {/* Journey Section (Resumen siempre visible) */}
          {!!(isPlanesproLead || journey) && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revisión PlanesPro</h3>
              
              {!!journey && (
                <div className="bg-slate-50 rounded-[8px] p-3 border border-slate-200 mb-3">
                  
                  {!!journey.resumen && (
                    <div className="bg-[#F2EEFF] rounded-[6px] p-3 border border-[#E0D4FF] mb-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[#6C4CF6]">
                        {Icon.CheckCircle()}
                        <span className="font-bold text-[11px] uppercase tracking-wide">Resumen</span>
                      </div>
                      <p className="text-[12px] text-[#5b3ce0] font-medium leading-relaxed">
                        {`${journey.resumen || ''}`}
                      </p>
                    </div>
                  )}

                  <details className="group">
                    <summary className="text-[11px] font-bold text-[#6C4CF6] cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">{Icon.ChevronRight()}</span> Ver respuestas originales
                    </summary>
                    <div className="mt-3 space-y-3 relative ml-2">
                      <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-slate-200 -z-10 rounded-full"></div>
                      
                      {!!journey.motivo && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-slate-50" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivo</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(`${journey.motivo || ''}`, STEP1_MOTIVO_LABELS)}</p>
                        </div>
                      )}
                      
                      {!!journey.necesidad && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-slate-50" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Necesidad</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(`${journey.necesidad || ''}`, STEP1_NECESIDAD_LABELS)}</p>
                        </div>
                      )}

                      {!!journey.objetivo && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-slate-50" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Objetivo</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(`${journey.objetivo || ''}`, STEP1_OBJETIVO_LABELS)}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Datos del Lead (Desplegable con Grid Completo) */}
          <details className="group bg-slate-50 border border-slate-200 rounded-[8px] overflow-hidden" open>
            <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:bg-slate-100 p-3 list-none flex items-center gap-2 select-none transition-colors">
              <span className="group-open:rotate-90 transition-transform text-[#6C4CF6]">{Icon.ChevronRight()}</span> 
              Detalles y Perfil
            </summary>
            
            <div className="p-3 pt-0 border-t border-slate-100 mt-1">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Fecha */}
                <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Fecha Registro</p>
                  <p className="text-[12px] font-semibold text-slate-700">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</p>
                </div>

                {/* Origen */}
                {!!(lead.source || rawPayload.origen || rawPayload.source) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Origen</p>
                    <p className="text-[12px] font-semibold text-slate-700 truncate">{`${lead.source || rawPayload.origen || rawPayload.source || ''}`}</p>
                  </div>
                )}

                {!!planesproDetails.rangoEdad && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Edad</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.rangoEdad}</p>
                  </div>
                )}
                
                {!!(planesproDetails.rangoRenta || rawPayload.renta || rawPayload.renta_liquida) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Renta</p>
                    <p className="text-[12px] font-semibold text-slate-700">{`${planesproDetails.rangoRenta || toReadableValue(rawPayload.renta) || toReadableValue(rawPayload.renta_liquida) || ''}`}</p>
                  </div>
                )}
                
                {/* Lógica Fonasa/Isapre */}
                {!!(planesproDetails.sistema && String(planesproDetails.sistema).toLowerCase() === 'fonasa') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sistema</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.sistema}</p>
                  </div>
                )}
                {!!planesproDetails.isapre && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Isapre</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.isapre}</p>
                  </div>
                )}

                {!!planesproDetails.comuna && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Comuna</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.comuna}</p>
                  </div>
                )}
                {!!planesproDetails.region && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Región</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.region}</p>
                  </div>
                )}

                {/* Cargas (en el grid si aplica) */}
                {!!(planesproDetails.numeroCargas && planesproDetails.numeroCargas !== '0') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-[#6C4CF6] font-bold uppercase tracking-wide">Cargas Familiares</p>
                      <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.numeroCargas} carga(s)</p>
                    </div>
                    {!!(planesproDetails.edadesCargas && planesproDetails.edadesCargas.length > 0) && (
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Edades</p>
                        <p className="text-[11px] font-semibold text-slate-600">{planesproDetails.edadesCargas.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* Mensaje / Comentario del cliente */}
          {!!planesproDetails.comentario && (
            <div className="mt-2 bg-[#F2EEFF] p-3 rounded-[6px] border border-[#E0D4FF]">
              <p className="text-[10px] text-[#6C4CF6] font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                {Icon.Messages()} Comentario del cliente
              </p>
              <p className="text-[12px] text-slate-800 font-medium whitespace-pre-wrap">{planesproDetails.comentario}</p>
            </div>
          )}
          
          {/* PDF Adjunto si existe */}
          {!!(planesproMetadata.pdf_path || pdfLoading || pdfError) && (
            <div className="mt-2 bg-slate-50 p-3 rounded-[6px] border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-[#6C4CF6]">{Icon.Layers()}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide">Documento PDF</p>
                  <p className="text-[10px] text-slate-500">{pdfFileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {planesproMetadata.pdf_path ? (
                  <>
                    <button onClick={() => { void submitPdfRequest(false); }} className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors">
                      Ver
                    </button>
                    <button onClick={() => { void submitPdfRequest(true); }} className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors">
                      Descargar
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">{pdfLoading ? 'Cargando...' : pdfError || 'Sin acceso'}</span>
                )}
              </div>
            </div>
          )}

          {/* Agenda Compacta */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cita / Agenda</h3>
            {!canCreateAppointment ? (
              <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-2.5 flex justify-between items-center">
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{`${visibleAppointmentStatus || ''}`}</p>
                  <p className="text-[12px] font-semibold text-slate-800">{formatAppointmentDate(`${visibleAppointmentAt || ''}`)}</p>
                </div>
                {onNavigate && (
                  <button onClick={() => { openAgendaAppointment(activeAppointment?.id); onClose(); onNavigate('agenda'); }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-[4px] text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
                    Ver cita
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[6px] p-2.5 shadow-sm space-y-2">
                <div className="flex gap-2">
                  <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={appointmentNote} onChange={(e) => setAppointmentNote(e.target.value)} placeholder="Nota (opcional)" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <button onClick={() => { void handleCreateAppointment(); }} disabled={appointmentLoading} className="px-3 py-1.5 bg-[#161A24] hover:bg-black text-white text-[11px] font-bold rounded-[4px] transition-colors disabled:opacity-60">
                    {appointmentLoading ? '...' : 'Agendar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Contacto y Notas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Interacciones</h3>
              <button onClick={() => setShowNotes(!showNotes)} className="text-[10px] font-bold text-[#6C4CF6] hover:underline bg-[#F2EEFF] px-2 py-0.5 rounded-[4px]">
                {showNotes ? 'Ocultar' : `Ver historial (${notes.length})`}
              </button>
            </div>
            
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Registrar interacción (ej. Se llamó y no contestó)..." 
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:bg-white transition-colors" 
              />
              <button onClick={addNote} className="px-3 py-1.5 bg-[#F2EEFF] text-[#6C4CF6] text-[12px] font-bold rounded-[6px] hover:bg-[#E0D4FF] transition-colors" title="Guardar">
                {Icon.Send()}
              </button>
            </div>

            {showNotes && (
              <div className="space-y-2 mt-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-[6px] p-2.5 border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Nota interna</span>
                      <span className="text-[9px] text-slate-400 font-medium">{new Date(note.createdAt).toLocaleString('es-CL')}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-center py-2 text-[11px] text-slate-400 italic">No hay interacciones registradas.</div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
"""

with open('src/components/leads/LeadDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content[:start_idx] + new_return_and_hooks)

print("Premium Redesign Applied Round 5")
