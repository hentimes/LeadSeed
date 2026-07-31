import re

with open('src/components/leads/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Fix `journey` extraction
# Search for `const journey = (planesproDetails as any)?.journey;`
content = content.replace(
    "const journey = (planesproDetails as any)?.journey;",
    "const journey = (planesproMetadata as any)?.intake_journey?.step1;"
)

# Search for the return block
match = re.search(r'\n  return \(\r?\n', content)
if not match:
    print("Could not find return statement")
    exit(1)

start_idx = match.start() + 1 

new_return = """  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-start justify-center pt-8 p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-white rounded-[12px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] w-full max-w-[400px] flex flex-col mx-auto animate-scale-in border border-slate-100 mb-8 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-gradient-to-br from-[#F2EEFF] to-[#E0D4FF] text-[#6C4CF6] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 leading-tight">{lead.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold tracking-wide"
                  style={{ backgroundColor: `${STATUS_COLORS[lead.status || 'nuevo']}15`, color: STATUS_COLORS[lead.status || 'nuevo'] }}
                >
                  {STATUS_LABELS[lead.status || 'nuevo']?.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {new Date(lead.createdAt).toLocaleDateString('es-CL')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { onEdit(lead); onClose(); }} className="p-1.5 text-slate-400 hover:text-[#6C4CF6] hover:bg-[#F2EEFF] rounded-[8px] transition-colors" title="Editar">
              {Icon.Edit()}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[8px] transition-colors" title="Cerrar">
              {Icon.Close()}
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pt-3 space-y-4">
          
          {/* Quick Actions / Info */}
          <div className="flex gap-2">
            {lead.phone && (
              <div className="flex-1 flex gap-1">
                <a href={`https://wa.me/${lead.phone.replace(/[^+\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#F0FDF4] text-[#16A34A] rounded-[8px] text-[11px] font-semibold hover:bg-[#DCFCE7] transition-colors border border-[#BBF7D0]">
                  {Icon.Phone()} {lead.phone}
                </a>
                <a href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`} className="w-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-[8px] hover:bg-slate-200 transition-colors border border-slate-200" title="Llamar">
                  {Icon.Phone()}
                </a>
              </div>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#EFF6FF] text-[#2563EB] rounded-[8px] text-[11px] font-semibold hover:bg-[#DBEAFE] transition-colors border border-[#BFDBFE]">
                {Icon.Email()} {lead.email.length > 20 ? lead.email.substring(0, 18) + '...' : lead.email}
              </a>
            )}
          </div>

          {/* Journey Section */}
          {(isPlanesproLead || journey) && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revisión PlanesPro</h3>
              
              {journey && (
                <div className="bg-[#FAFAFA] rounded-[8px] p-3 border border-slate-100 mb-3">
                  
                  {journey.resumen && (
                    <div className="bg-[#F2EEFF] rounded-[8px] p-3 border border-[#E0D4FF] mb-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[#6C4CF6]">
                        {Icon.CheckCircle()}
                        <span className="font-bold text-[11px] uppercase tracking-wide">Resumen</span>
                      </div>
                      <p className="text-[12px] text-[#5b3ce0] font-medium leading-relaxed">
                        {journey.resumen}
                      </p>
                    </div>
                  )}

                  <details className="group">
                    <summary className="text-[11px] font-bold text-[#6C4CF6] cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">{Icon.ChevronRight()}</span> Ver respuestas originales
                    </summary>
                    <div className="mt-3 space-y-3 relative ml-2">
                      <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-slate-200 -z-10 rounded-full"></div>
                      
                      {journey.motivo && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-[#FAFAFA]" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivo</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(journey.motivo, STEP1_MOTIVO_LABELS)}</p>
                        </div>
                      )}
                      
                      {journey.necesidad && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-[#FAFAFA]" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Necesidad</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(journey.necesidad, STEP1_NECESIDAD_LABELS)}</p>
                        </div>
                      )}

                      {journey.objetivo && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[1.5px] top-1.5 w-2 h-2 rounded-full bg-[#6C4CF6] ring-4 ring-[#FAFAFA]" />
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Objetivo</p>
                          <p className="text-[12px] font-medium text-slate-800 leading-snug">{toJourneyLabel(journey.objetivo, STEP1_OBJETIVO_LABELS)}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Grid 2 Columnas para datos de perfil */}
              <div className="grid grid-cols-2 gap-2">
                {planesproDetails.rangoEdad && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Edad</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.rangoEdad}</p>
                  </div>
                )}
                {planesproDetails.rangoRenta && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Renta</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.rangoRenta}</p>
                  </div>
                )}
                {planesproDetails.sistema && planesproDetails.sistema.toLowerCase() === 'fonasa' && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sistema</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.sistema}</p>
                  </div>
                )}
                {planesproDetails.isapre && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Isapre</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.isapre}</p>
                  </div>
                )}
                {planesproDetails.comuna && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Comuna</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.comuna}</p>
                  </div>
                )}
                {planesproDetails.region && (
                  <div className="bg-slate-50 p-2 rounded-[8px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Región</p>
                    <p className="text-[12px] font-semibold text-slate-700">{planesproDetails.region}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agenda Compacta */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cita / Agenda</h3>
            {!canCreateAppointment ? (
              <div className="bg-blue-50 border border-blue-100 rounded-[8px] p-2.5 flex justify-between items-center">
                <div>
                  <p className="text-[11px] text-blue-500 font-bold uppercase tracking-wide">{visibleAppointmentStatus}</p>
                  <p className="text-[12px] font-semibold text-blue-800">{formatAppointmentDate(visibleAppointmentAt)}</p>
                </div>
                {onNavigate && (
                  <button onClick={() => { openAgendaAppointment(activeAppointment?.id); onClose(); onNavigate('agenda'); }} className="px-3 py-1.5 bg-white border border-blue-200 rounded-[6px] text-[11px] font-bold text-blue-700 shadow-sm hover:bg-blue-100 transition-colors">
                    Ver cita
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[8px] p-2.5 shadow-sm space-y-2">
                <div className="flex gap-2">
                  <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[6px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[6px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={appointmentNote} onChange={(e) => setAppointmentNote(e.target.value)} placeholder="Nota (opcional)" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-[6px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6]" />
                  <button onClick={() => { void handleCreateAppointment(); }} disabled={appointmentLoading} className="px-3 py-1.5 bg-[#161A24] hover:bg-black text-white text-[11px] font-bold rounded-[6px] transition-colors disabled:opacity-60">
                    {appointmentLoading ? '...' : 'Agendar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Notas</h3>
              <button onClick={() => setShowNotes(!showNotes)} className="text-[10px] font-bold text-[#6C4CF6] hover:underline">
                {showNotes ? 'Ocultar' : `Ver historial (${notes.length})`}
              </button>
            </div>
            
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Escribe una nota rápida..." 
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] text-[11px] text-slate-700 focus:outline-none focus:border-[#6C4CF6] focus:bg-white transition-colors" 
              />
              <button onClick={addNote} className="px-3 py-1.5 bg-[#F2EEFF] text-[#6C4CF6] text-[12px] font-bold rounded-[8px] hover:bg-[#E0D4FF] transition-colors">
                {Icon.Send()}
              </button>
            </div>

            {showNotes && (
              <div className="space-y-2 mt-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-[8px] p-2.5 border border-slate-100">
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">{new Date(note.createdAt).toLocaleString('es-CL')}</p>
                  </div>
                ))}
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
    f.write(content[:start_idx] + new_return)

print("Premium Redesign Applied Round 2")
