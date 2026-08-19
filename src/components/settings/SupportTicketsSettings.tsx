import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import { Requirement } from '../../types';
import SupportTicketModal from '../support/SupportTicketModal';
import { loadUserSupportRequirements, rateSupportRequirement, subscribeUserSupportRequirements } from '../../services/supportService';
import { formatearFecha } from '../../utils/date';

export default function SupportTicketsSettings() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = async () => {
    if (!user) return;
    setLoading(true);
    setRequirements(await loadUserSupportRequirements(user.id));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchRequirements();

    return subscribeUserSupportRequirements(user.id, 'settings_user_reqs', fetchRequirements);
  }, [user]);

  const handleRate = async (reqId: string, rating: 'up' | 'down') => {
    await rateSupportRequirement(reqId, rating);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-line rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-4 flex-col sm:flex-row">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Icon.Messages />
          </div>
          <div>
            <h3 className="font-bold text-ink mb-1">Centro de Ayuda</h3>
            <p className="text-sm text-ink-muted max-w-md">
              ¿Tienes un problema técnico, duda de facturación o una sugerencia? Levanta un requerimiento oficial.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {requirements.some(r => ['open', 'in_progress', 'claim'].includes(r.status)) ? (
            <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-xs font-medium border border-amber-200 flex items-center gap-2">
              <Icon.Warning /> Ya tienes un ticket activo en progreso.
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 justify-center w-full"
            >
              <Icon.Plus /> Levantar Ticket
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-line bg-surface-muted">
          <h3 className="font-bold text-ink flex items-center gap-2">
            <Icon.Lists /> Mis Requerimientos
          </h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center p-8 text-ink-muted">Cargando tus tickets...</div>
          ) : requirements.length === 0 ? (
            <div className="text-center p-8 text-ink-muted flex flex-col items-center">
              <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center text-ink-muted mb-3">
                <Icon.Inbox />
              </div>
              No tienes ningún requerimiento enviado.
            </div>
          ) : (
            <div className="space-y-4">
              {requirements.map(req => (
                <div key={req.id} className="border border-line rounded-xl p-4 bg-surface-muted hover:bg-surface-muted transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        {req.type}
                      </span>
                      {req.ticket_code && (
                        <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                          {req.ticket_code}
                        </span>
                      )}
                      <span className="text-xs text-ink-muted ml-1">{formatearFecha(req.created_at)}</span>
                    </div>
                    <div className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      req.status === 'open' ? 'bg-surface-hover text-ink-secondary' : 
                      req.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {req.status === 'open' ? 'Pendiente' : req.status === 'in_progress' ? 'En Revisión' : 'Resuelto'}
                    </div>
                  </div>
                  <p className="text-sm text-ink-secondary mt-3">{req.content}</p>
                  
                  {req.status === 'closed' && (
                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-muted">
                        {req.rating ? '¡Gracias por calificar!' : '¿Qué te pareció la atención?'}
                      </span>
                      <div className="flex gap-2">
                        {req.rating === 'down' || !req.rating ? (
                          <button 
                            disabled={!!req.rating}
                            onClick={() => handleRate(req.id, 'down')}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-medium transition-all
                              ${req.rating === 'down' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-surface text-ink-muted border-line hover:text-red-500 hover:border-red-200'}`}
                          >
                            <Icon.Close /> {req.rating === 'down' && 'Mala'}
                          </button>
                        ) : null}
                        {req.rating === 'up' || !req.rating ? (
                          <button 
                            disabled={!!req.rating}
                            onClick={() => handleRate(req.id, 'up')}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-medium transition-all
                              ${req.rating === 'up' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-surface text-ink-muted border-line hover:text-green-500 hover:border-green-200'}`}
                          >
                            <Icon.Check /> {req.rating === 'up' && 'Buena'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SupportTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
