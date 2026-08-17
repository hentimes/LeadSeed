import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { changeAvatar, saveProfileFields } from '../../services/profileService';
import { Icon } from '../../utils/icons';
import { Modal } from '../../design';
import { getErrorMessage } from '../../utils/errorMessage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { profile, user, refreshProfile, hasFeature, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(profile?.bio || '');
  const [showFrame, setShowFrame] = useState(profile?.show_premium_frame || false);
  const [isInvisible, setIsInvisible] = useState(profile?.is_invisible || false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setLoading(true);
    setError('');
    try {
      await changeAvatar(user.id, file);

      await refreshProfile();
      setSuccess('Foto de perfil actualizada');
    } catch (err) {
      console.error(err);
      setError('Error al subir imagen: ' + getErrorMessage(err, 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await saveProfileFields(user.id, {
        bio,
        show_premium_frame: showFrame,
        is_invisible: isInvisible,
      });
      
      await refreshProfile();
      setSuccess('Perfil guardado exitosamente');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Error al guardar: ' + getErrorMessage(err, 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const isPro = hasFeature('premium_aesthetics') || isAdmin;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <Modal onClose={onClose} maxWidth="448px" label="Editar perfil">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink">Editar Perfil</h2>
          <button onClick={onClose} className="p-2 text-ink-muted hover:text-ink-secondary">
            <Icon.Close />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm border border-green-100">
            {success}
          </div>
        )}

        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-surface-hover ${showFrame && isPro ? 'ring-4 ring-yellow-400 p-1' : 'border border-line'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-bold text-ink-muted">{user?.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              <span className="text-xs font-medium">Cambiar</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={loading} />
            </label>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-ink">{profile?.full_name || user?.email}</h3>
            <p className="text-xs text-ink-muted">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-ink-secondary">
                Biografía corta
              </label>
              {!isEditingBio && (
                <button 
                  onClick={() => setIsEditingBio(true)}
                  className="text-ink-muted hover:text-blue-500 transition-colors p-1"
                  title="Editar descripción"
                >
                  <Icon.Edit />
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Hola, soy experto..."
                  rows={3}
                  maxLength={140}
                  className="w-full p-2.5 rounded-xl border border-line bg-surface-muted text-sm focus:ring-2 focus:ring-blue-500 outline-none text-ink resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${bio.length === 140 ? 'text-red-500 font-bold' : 'text-ink-muted'}`}>
                    {bio.length} / 140
                  </span>
                  <button 
                    onClick={() => setIsEditingBio(false)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                  >
                    <Icon.Check /> Listo
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary bg-surface-muted p-3 rounded-xl border border-line min-h-[46px] flex items-center">
                {bio || <span className="italic text-ink-muted">Sin descripción. Haz clic en el lápiz para añadir una.</span>}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-muted">
            <div>
              <p className="text-sm font-medium text-ink">Marco Premium</p>
              <p className="text-xs text-ink-muted">Destaca tu perfil en la comunidad</p>
            </div>
            {isPro ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={showFrame} onChange={(e) => setShowFrame(e.target.checked)} />
                <div className="w-11 h-6 bg-surface-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface dark:backdrop-blur-md after:border-line-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md">Pro</span>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-muted">
            <div>
              <p className="text-sm font-medium text-ink">Modo Fantasma</p>
              <p className="text-xs text-ink-muted">Oculta tu estado de conexión en la comunidad</p>
            </div>
            {isPro ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isInvisible} onChange={(e) => setIsInvisible(e.target.checked)} />
                <div className="w-11 h-6 bg-surface-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface dark:backdrop-blur-md after:border-line-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md">Pro</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium text-ink-secondary hover:bg-surface-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Perfil'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
