import type { Lead, LeadList, Page } from '../../types';
import { Icon } from '../../utils/icons';
import { useLeadDetail, toJourneyLabel } from '../../hooks/useLeadDetail';
import LeadDetailHeader from './detail/LeadDetailHeader';
import LeadDetailContact from './detail/LeadDetailContact';
import LeadDetailCrossExecAlert from './detail/LeadDetailCrossExecAlert';
import LeadDetailHistory from './detail/LeadDetailHistory';
import { Modal } from '../../design/Modal';

interface Props {
  lead: Lead;
  lists: LeadList[];
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onNavigate?: (page: Page) => void;
}

function formatAppointmentDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CL');
}

function openAgendaAppointment(appointmentId?: string): void {
  if (!appointmentId) return;
  window.location.hash = `#agenda?appointment=${appointmentId}`;
}

function openMeetLink(meetLink: string): void {
  window.open(meetLink, '_blank', 'noopener,noreferrer');
}

export default function LeadDetail({ lead, lists, onClose, onEdit, onNavigate }: Props) {
  const detail = useLeadDetail(lead);

  const documentId =
    (lead as unknown as { documentId?: string }).documentId ||
    detail.rawPayload.rut ||
    detail.rawPayload.document_id;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal onClose={onClose} label={`Detalle de ${lead.name}`}>
      <>
        <LeadDetailHeader
          lead={lead}
          documentId={documentId ? String(documentId) : undefined}
          onEdit={() => {
            onEdit(lead);
            onClose();
          }}
          onClose={onClose}
        />

        <div className="flex-1 p-4 pt-3 space-y-4">
          <LeadDetailContact phone={lead.phone} email={lead.email} onCopy={copyToClipboard} />

          <LeadDetailCrossExecAlert alerts={detail.crossExecAlerts} getMessage={detail.getCrossExecMessage} />

          {/* Journey Section (Resumen siempre visible) */}
          {!!(detail.isPlanesproLead || detail.journey) && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revisión PlanesPro</h3>

              {!!detail.journey && (
                <div className="bg-slate-50 rounded-[8px] p-3 border border-slate-200 mb-3">
                  {!!detail.journey.resumen && (
                    <div className="bg-primary-soft rounded-[6px] p-3 border border-primary-soft-strong mb-2">
                      <div className="flex items-center gap-1.5 mb-1 text-primary">
                        {Icon.CheckCircle()}
                        <span className="font-bold text-[11px] uppercase tracking-wide">Resumen</span>
                      </div>
                      <p className="text-[12px] text-primary-hover font-medium leading-relaxed">
                        {`${detail.journey.resumen || ''}`}
                      </p>
                    </div>
                  )}

                  <details className="group">
                    <summary className="text-[11px] font-bold text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">{Icon.ChevronRight()}</span> Ver
                      respuestas originales
                    </summary>
                    <div className="mt-3 flex gap-2 w-full">
                      {!!detail.journey.motivo && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">Motivo</p>
                          <p
                            className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2"
                            title={toJourneyLabel(`${detail.journey.motivo || ''}`, detail.journeyLabels.motivo)}
                          >
                            {toJourneyLabel(`${detail.journey.motivo || ''}`, detail.journeyLabels.motivo)}
                          </p>
                        </div>
                      )}

                      {!!detail.journey.necesidad && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">
                            Necesidad
                          </p>
                          <p
                            className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2"
                            title={toJourneyLabel(`${detail.journey.necesidad || ''}`, detail.journeyLabels.necesidad)}
                          >
                            {toJourneyLabel(`${detail.journey.necesidad || ''}`, detail.journeyLabels.necesidad)}
                          </p>
                        </div>
                      )}

                      {!!detail.journey.objetivo && (
                        <div className="flex-1 bg-white p-1.5 rounded-[6px] border border-slate-200 shadow-sm min-w-0">
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">
                            Objetivo
                          </p>
                          <p
                            className="text-[10px] font-semibold text-slate-700 leading-tight mt-0.5 line-clamp-2"
                            title={toJourneyLabel(`${detail.journey.objetivo || ''}`, detail.journeyLabels.objetivo)}
                          >
                            {toJourneyLabel(`${detail.journey.objetivo || ''}`, detail.journeyLabels.objetivo)}
                          </p>
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
            <summary className="text-[11px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:bg-slate-100 p-3 list-none flex items-center justify-between select-none transition-colors">
              <div className="flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform text-primary">{Icon.ChevronRight()}</span>
                Detalles y Perfil
              </div>
              <span className="text-[11px] font-semibold text-slate-400 tracking-normal normal-case">
                {new Date(lead.createdAt).toLocaleDateString('es-CL')}
              </span>
            </summary>

            <div className="p-3 pt-0 border-t border-slate-100 mt-1">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {!!((lead as unknown as { source?: string }).source || detail.rawPayload.origen || detail.rawPayload.source) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Origen</p>
                    <p className="text-[12px] font-semibold text-slate-700 truncate">
                      {`${(lead as unknown as { source?: string }).source || detail.rawPayload.origen || detail.rawPayload.source || ''}`}
                    </p>
                  </div>
                )}

                {!!detail.planesproDetails.rangoEdad && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Edad</p>
                    <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.rangoEdad}</p>
                  </div>
                )}

                {!!(detail.planesproDetails.rangoRenta || detail.rawPayload.renta || detail.rawPayload.renta_liquida) && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Renta</p>
                    <p className="text-[12px] font-semibold text-slate-700">
                      {`${detail.planesproDetails.rangoRenta || detail.rawPayload.renta || detail.rawPayload.renta_liquida || ''}`}
                    </p>
                  </div>
                )}

                {!!(detail.planesproDetails.sistema && String(detail.planesproDetails.sistema).toLowerCase() === 'fonasa') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sistema</p>
                    <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.sistema}</p>
                  </div>
                )}
                {!!detail.planesproDetails.isapre && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Isapre</p>
                    <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.isapre}</p>
                  </div>
                )}

                {!!detail.planesproDetails.comuna && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Comuna</p>
                    <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.comuna}</p>
                  </div>
                )}
                {!!detail.planesproDetails.region && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Región</p>
                    <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.region}</p>
                  </div>
                )}

                {!!(detail.planesproDetails.numeroCargas && detail.planesproDetails.numeroCargas !== '0') && (
                  <div className="bg-white p-2 rounded-[6px] border border-slate-100 shadow-sm col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wide">Cargas Familiares</p>
                      <p className="text-[12px] font-semibold text-slate-700">{detail.planesproDetails.numeroCargas} carga(s)</p>
                    </div>
                    {!!(detail.planesproDetails.edadesCargas && detail.planesproDetails.edadesCargas.length > 0) && (
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Edades</p>
                        <p className="text-[11px] font-semibold text-slate-600">
                          {detail.planesproDetails.edadesCargas.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* Mensaje / Comentario del cliente */}
          {!!detail.planesproDetails.comentario && (
            <div className="mt-2 bg-primary-soft p-3 rounded-[6px] border border-primary-soft-strong">
              <p className="text-[10px] text-primary font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                {Icon.Messages()} Comentario del cliente
              </p>
              <p className="text-[12px] text-slate-800 font-medium whitespace-pre-wrap">
                {detail.planesproDetails.comentario}
              </p>
            </div>
          )}

          {/* PDF Adjunto si existe */}
          {!!(detail.planesproMetadata.pdf_path || detail.pdfLoading || detail.pdfError) && (
            <div className="mt-2 bg-slate-50 p-3 rounded-[6px] border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-primary">{Icon.Layers()}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide">Documento PDF</p>
                  <p className="text-[10px] text-slate-500">{detail.pdfFileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detail.planesproMetadata.pdf_path ? (
                  <>
                    <button
                      onClick={() => {
                        void detail.submitPdfRequest(false);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => {
                        void detail.submitPdfRequest(true);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-600 hover:bg-slate-100 bg-white shadow-sm transition-colors"
                    >
                      Descargar
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {detail.pdfLoading ? 'Cargando...' : detail.pdfError || 'Sin acceso'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Agenda Compacta */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cita / Agenda</h3>
            {!detail.canCreateAppointment ? (
              <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                      {`${detail.visibleAppointmentStatus || ''}`}
                    </p>
                    <p className="text-[12px] font-semibold text-slate-800">
                      {formatAppointmentDate(`${detail.visibleAppointmentAt || ''}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {detail.visibleMeetLink && (
                      <button
                        onClick={() => openMeetLink(detail.visibleMeetLink as string)}
                        className="px-3 py-1.5 bg-primary-soft border border-primary-soft-strong rounded-[4px] text-[11px] font-bold text-primary shadow-sm hover:bg-primary-soft-strong transition-colors"
                      >
                        Abrir Meet
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        onClick={() => {
                          openAgendaAppointment(detail.activeAppointment?.id);
                          onClose();
                          onNavigate('agenda');
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-[4px] text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors"
                      >
                        Ver cita
                      </button>
                    )}
                  </div>
                </div>
                {detail.googleSyncBadgeLabel && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded shrink-0">
                      {detail.googleSyncBadgeLabel}
                    </span>
                    {detail.googlePendingSummary && (
                      <p className="text-[10px] leading-4 text-amber-800">{detail.googlePendingSummary}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[6px] p-2.5 shadow-sm space-y-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={detail.appointmentDate}
                    onChange={(e) => detail.setAppointmentDate(e.target.value)}
                    className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-primary"
                  />
                  <input
                    type="time"
                    value={detail.appointmentTime}
                    onChange={(e) => detail.setAppointmentTime(e.target.value)}
                    className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] font-medium text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={detail.appointmentNote}
                    onChange={(e) => detail.setAppointmentNote(e.target.value)}
                    placeholder="Nota (opcional)"
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-[4px] text-[11px] text-slate-700 focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => {
                      void detail.handleCreateAppointment();
                    }}
                    disabled={detail.appointmentLoading}
                    className="px-3 py-1.5 bg-ink hover:bg-black text-white text-[11px] font-bold rounded-[4px] transition-colors disabled:opacity-60"
                  >
                    {detail.appointmentLoading ? '...' : 'Agendar'}
                  </button>
                </div>
                {!!detail.appointmentError && (
                  <p className="text-[10px] text-red-600 font-medium">{detail.appointmentError}</p>
                )}
                {!!detail.appointmentMessage && (
                  <p className="text-[10px] text-emerald-600 font-medium">{detail.appointmentMessage}</p>
                )}
              </div>
            )}
          </div>

          <LeadDetailHistory
            notes={detail.notes}
            newNote={detail.newNote}
            onNewNoteChange={detail.setNewNote}
            onAddNote={() => {
              void detail.addNote();
            }}
            showNotes={detail.showNotes}
            onToggleNotes={() => detail.setShowNotes(!detail.showNotes)}
            sendLogs={detail.sendLogs}
            showLogs={detail.showLogs}
            onToggleLogs={() => detail.setShowLogs(!detail.showLogs)}
            expandedLogId={detail.expandedLogId}
            onToggleExpandedLog={(id) => detail.setExpandedLogId(detail.expandedLogId === id ? null : id)}
            getTemplateName={detail.getTemplateName}
            getTemplateContent={detail.getTemplateContent}
            isEmailTemplateHtml={detail.isEmailTemplateHtml}
          />
        </div>
      </>
    </Modal>
  );
}
