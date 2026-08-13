import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import { createSupportTicket } from '../../services/supportService';
import { Modal } from '../../design';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportTicketModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !user) return;
    
    setLoading(true);

    try {
      await createSupportTicket(user.id, category, description);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCategory('');
        setDescription('');
        onClose();
      }, 2000);
    } catch {
      setLoading(false);
      alert('Error al enviar el requerimiento.');
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="448px" label="Levantar requerimiento de soporte">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <Icon.Close />
          </button>
          <div className="w-12 h-12 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <Icon.Messages />
          </div>
          <h2 className="text-xl font-bold">Levantar Requerimiento</h2>
          <p className="text-sm text-indigo-100 mt-1 opacity-90">Soporte Técnico VIP</p>
        </div>

        {success ? (
          <div className="p-8 text-center text-green-600">
            <div className="text-4xl mb-2"><Icon.Check /></div>
            <p className="font-bold">¡Requerimiento enviado!</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">El Superadmin lo revisará pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Tipo de problema
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                required
              >
                <option value="">Selecciona una opción...</option>
                <option value="Fallo Técnico">Fallo Técnico / Bug</option>
                <option value="Facturación">Dudas de Facturación</option>
                <option value="Sugerencia">Sugerencia de Mejora</option>
                <option value="Otro">Otro problema</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Descripción
                </label>
                <span className={`text-xs font-mono ${description.length > 255 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {description.length}/255
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 255))}
                placeholder="Describe tu problema brevemente..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none h-24"
                maxLength={255}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !category || !description.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : (
                <>
                  <Icon.Send /> Enviar Requerimiento
                </>
              )}
            </button>
          </form>
        )}
    </Modal>
  );
}
