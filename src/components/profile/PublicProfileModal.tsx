import { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '../../design';
import { fetchPublicProfile, type PublicProfile } from '../../repositories/publicProfileRepository';

interface PublicProfileModalProps {
  userId: string;
  /** Nombre ya conocido, para no mostrar el panel vacio mientras carga. */
  fallbackName?: string;
  onClose: () => void;
  onSendMessage?: () => void;
}

export default function PublicProfileModal({
  userId,
  fallbackName,
  onClose,
  onSendMessage,
}: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchPublicProfile(userId).then((data) => {
      if (cancelled) return;
      setProfile(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = profile?.full_name || fallbackName || 'Usuario';
  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;

  return (
    <Modal onClose={onClose} maxWidth="340px" label={`Perfil de ${name}`}>
      <div className="flex flex-col items-center gap-3 p-5 text-center">
        <div
          className={
            profile?.show_premium_frame
              ? 'p-[3px] bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full'
              : ''
          }
        >
          <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
        </div>

        <div>
          <h2 className="text-section-title font-semibold text-ink">{name}</h2>
          {profile?.is_helper && <Badge tone="info" className="mt-1">Equipo de soporte</Badge>}
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">Cargando perfil...</p>
        ) : (
          <p className="text-sm text-ink-muted whitespace-pre-wrap">
            {profile?.bio || 'Sin descripción todavía.'}
          </p>
        )}

        {profile?.badges && profile.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {profile.badges.map((badge) => (
              <Badge key={badge} tone="primary">
                {badge}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          {onSendMessage && (
            <Button
              variant="primary"
              onClick={() => {
                onSendMessage();
                onClose();
              }}
            >
              Enviar mensaje
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
