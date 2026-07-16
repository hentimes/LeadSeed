import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';

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

    const generateTicketCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `REQ-${result}`;
    };

    const { error } = await supabase.from('requirements').insert({
      user_id: user.id,
      ticket_code: generateTicketCode(),
      type: category,
      content: description,
      status: 'open'
    });

    setLoading(false);
    if (error) {
      alert('Error al enviar el requerimiento.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCategory('');
        setDescription('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <Icon.Close />
          </button>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <Icon.Messages />
          </div>
          <h2 className="text-xl font-bold">Levantar Requerimiento</h2>
          <p className="text-sm text-indigo-100 mt-1 opacity-90">Soporte Técnico VIP</p>
        </div>

        {success ? (
          <div className="p-8 text-center text-green-600">
            <div className="text-4xl mb-2"><Icon.Check /></div>
            <p className="font-bold">¡Requerimiento enviado!</p>
            <p className="text-sm text-gray-500 mt-1">El Superadmin lo revisará pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tipo de problema
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
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
                <label className="block text-sm font-semibold text-gray-700">
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none h-24"
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
      </div>
    </div>
  );
}
