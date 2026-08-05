import { useState } from 'react';
import { Button, Modal } from '../../design';
import { updateChatRoomInfo } from '../../services/chatService';
import { useOnlineDirectory } from '../../hooks/useOnlineDirectory';
import { useActiveBans } from '../../hooks/useActiveBans';
import { useRoomAttachments } from '../../hooks/useRoomAttachments';
import { attachmentPublicUrl } from '../../services/chatAttachmentsService';
import { formatFileSize } from '../../utils/formatFileSize';
import ChatMembersPanel, { type ChatMemberTarget } from './ChatMembersPanel';
import HighlightedMessagesCarousel from './HighlightedMessagesCarousel';
import AttachmentLightbox from './AttachmentLightbox';
import type { ChatRoom } from '../../types';
import type { ChatHighlightedMessage } from '../../services/chatModerationService';

interface RoomInfoModalProps {
  room: ChatRoom;
  isStaff: boolean;
  highlights: ChatHighlightedMessage[];
  onRemoveHighlight: (messageId: string, highlightedBy: string) => void;
  onClose: () => void;
  onRoomUpdated: (room: ChatRoom) => void;
  currentUserId?: string;
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  onOpenProfile: (target: ChatMemberTarget) => void;
  onOpenDirectMessage: (target: ChatMemberTarget) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-micro font-bold uppercase tracking-wider text-ink-muted mb-2">{children}</h3>
  );
}

export default function RoomInfoModal({
  room,
  isStaff,
  highlights,
  onRemoveHighlight,
  onClose,
  onRoomUpdated,
  currentUserId,
  memberSearch,
  onMemberSearchChange,
  onOpenProfile,
  onOpenDirectMessage,
}: RoomInfoModalProps) {
  const { count: onlineCount } = useOnlineDirectory();
  const activeBans = useActiveBans(isStaff);
  const attachments = useRoomAttachments(room.id);
  const [filesTab, setFilesTab] = useState<'images' | 'files'>('images');
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(room.description || '');
  const [rules, setRules] = useState(room.rules || '');
  const [saving, setSaving] = useState(false);

  const fieldClass =
    'w-full resize-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateChatRoomInfo(room.id, { description, rules });
      onRoomUpdated({ ...room, description, rules });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="420px" label={`Información de ${room.name}`}>
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-line dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-section-title font-semibold text-ink"># {room.name}</h2>
            <p className="text-xs text-ink-muted mt-0.5">{onlineCount} conectados ahora</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-full text-ink-muted hover:bg-surface-muted dark:hover:bg-gray-700 hover:text-ink transition-colors"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>Descripción y reglas</SectionTitle>
              {isStaff && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Editar
                </button>
              )}
            </div>

            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="¿De qué se trata esta sala?"
                  rows={2}
                  className={fieldClass}
                />
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Reglas de la sala..."
                  rows={3}
                  className={fieldClass}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink dark:text-gray-200 whitespace-pre-wrap">
                  {room.description || 'Sin descripción todavía.'}
                </p>
                {room.rules && (
                  <p className="text-sm text-ink-muted whitespace-pre-wrap mt-2 border-l-2 border-line dark:border-gray-700 pl-2">
                    {room.rules}
                  </p>
                )}
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>Archivos</SectionTitle>
              <div className="flex items-center gap-1 rounded-full bg-surface-muted dark:bg-gray-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setFilesTab('images')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    filesTab === 'images'
                      ? 'bg-white dark:bg-gray-900 text-ink dark:text-gray-100 shadow-sm'
                      : 'text-ink-muted'
                  }`}
                >
                  Imágenes ({attachments.images.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilesTab('files')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    filesTab === 'files'
                      ? 'bg-white dark:bg-gray-900 text-ink dark:text-gray-100 shadow-sm'
                      : 'text-ink-muted'
                  }`}
                >
                  Archivos ({attachments.files.length})
                </button>
              </div>
            </div>

            {filesTab === 'images' ? (
              attachments.images.length === 0 ? (
                <p className="text-sm text-ink-muted">Todavía no se compartieron imágenes.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {attachments.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() =>
                        setExpandedImage({ src: attachmentPublicUrl(image.storage_path), alt: image.file_name })
                      }
                      className="aspect-square rounded-lg overflow-hidden bg-surface-muted dark:bg-gray-900 border border-line dark:border-gray-700"
                      title={image.file_name}
                    >
                      <img
                        src={attachmentPublicUrl(image.storage_path)}
                        alt={image.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )
            ) : attachments.files.length === 0 ? (
              <p className="text-sm text-ink-muted">Todavía no se compartieron archivos.</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.files.map((file) => (
                  <a
                    key={file.id}
                    href={attachmentPublicUrl(file.storage_path)}
                    target="_blank"
                    rel="noreferrer"
                    download={file.file_name}
                    className="flex items-center gap-2.5 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 hover:border-primary/40 transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-xs font-medium text-ink dark:text-gray-100 truncate">
                      {file.file_name}
                    </span>
                    <span className="text-[10px] text-ink-muted flex-shrink-0">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {expandedImage && (
              <AttachmentLightbox
                src={expandedImage.src}
                alt={expandedImage.alt}
                onClose={() => setExpandedImage(null)}
              />
            )}
          </section>

          <section>
            <SectionTitle>Mensajes destacados ({highlights.length})</SectionTitle>
            <HighlightedMessagesCarousel highlights={highlights} onRemove={onRemoveHighlight} />
          </section>

          <section>
            <SectionTitle>Conectados ({onlineCount})</SectionTitle>
            <div className="h-[236px] rounded-xl border border-line dark:border-gray-700 overflow-hidden">
              <ChatMembersPanel
                currentUserId={currentUserId}
                search={memberSearch}
                onSearchChange={onMemberSearchChange}
                onOpenProfile={onOpenProfile}
                onOpenDirectMessage={onOpenDirectMessage}
              />
            </div>
          </section>

          {isStaff && (
            <section>
              <SectionTitle>Baneos activos ({activeBans.bans.length})</SectionTitle>
              {activeBans.bans.length === 0 ? (
                <p className="text-sm text-ink-muted">No hay usuarios baneados ahora.</p>
              ) : (
                <div className="space-y-2">
                  {activeBans.bans.map((ban) => (
                    <div
                      key={ban.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-state-danger-soft px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-state-danger truncate">{ban.userName}</p>
                        <p className="text-[10px] text-ink-muted truncate">
                          {ban.banned_until
                            ? `Hasta ${new Date(ban.banned_until).toLocaleString()}`
                            : 'Permanente'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void activeBans.lift(ban.id)}
                        className="text-[11px] font-semibold text-primary hover:underline flex-shrink-0"
                      >
                        Levantar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
