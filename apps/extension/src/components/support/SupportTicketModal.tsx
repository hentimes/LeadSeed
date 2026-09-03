import { useState } from 'react';
import { getPlatform } from '../../platform/registry';
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
      await getPlatform().dialogs.alert('No se pudo enviar el requerimiento. Probá de nuevo.', {
        title: 'Algo falló',
      });
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="448px" label="Levantar requerimiento de soporte">
        {/* Header
            El icono estaba en un bloque propio de 48px centrado, con el titulo
            debajo: eso hacia la cabecera mucho mas alta de lo que su contenido
            justifica. Ahora va en linea con el titulo.

            Ademas el recuadro del icono declaraba
            `bg-white dark:bg-slate-800/80 dark:backdrop-blur-md/20 backdrop-blur-md`.
            Eso era `bg-white/20` antes de un barrido de modo oscuro que le metio
            clases en medio y dejo el `/20` pegado a `dark:backdrop-blur-md`, que
            no es una clase que exista. Resultado: blanco opaco con un icono
            blanco encima, o sea un cuadrado en blanco. */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-surface/20 shadow-inner backdrop-blur-md">
            <Icon.Messages />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight">Levantar Requerimiento</h2>
            <p className="text-xs text-indigo-100 opacity-90">Soporte Técnico VIP</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto shrink-0 text-white/70 transition-colors hover:text-white"
          >
            <Icon.Close />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center text-green-600">
            <div className="text-4xl mb-2"><Icon.Check /></div>
            <p className="font-bold">¡Requerimiento enviado!</p>
            <p className="text-sm text-ink-muted mt-1">El Superadmin lo revisará pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1.5">
                Tipo de problema
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-muted border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
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
                <label className="block text-sm font-semibold text-ink-secondary">
                  Descripción
                </label>
                <span className={`text-xs font-mono ${description.length > 255 ? 'text-red-500 font-bold' : 'text-ink-muted'}`}>
                  {description.length}/255
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 255))}
                placeholder="Describe tu problema brevemente..."
                className="w-full bg-surface-muted border border-line rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none h-24"
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
