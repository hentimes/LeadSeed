import { useState } from 'react';
import { Button, EmptyState, IconButton, Modal, SegmentedControl } from '../../design';
import { updateChatRoomInfo } from '../../services/chatService';
import { useOnlineDirectory } from '../../hooks/useOnlineDirectory';
import { useActiveBans } from '../../hooks/useActiveBans';
import { useRoomAttachments } from '../../hooks/useRoomAttachments';
import { attachmentPublicUrl } from '../../services/chatAttachmentsService';
import { formatFileSize } from '../../utils/formatFileSize';
import { formatearFechaHora } from '../../utils/date';
import { Icon } from '../../utils/icons';
import { ChatIcon } from './ChatIcons';
import ChatMembersPanel, { type ChatMemberTarget } from './ChatMembersPanel';
import HighlightedMessagesCarousel from './HighlightedMessagesCarousel';
import AttachmentLightbox from './AttachmentLightbox';
import RoomInfoTabs, { type RoomInfoTab } from './RoomInfoTabs';
import type { ChatRoom } from '../../types';
import type { ChatHighlightedMessage } from '../../services/chatModerationService';

/**
 * INFORMACION DE LA SALA
 *
 * Antes era todo apilado en vertical dentro de un modal con scroll:
 * descripcion y reglas en un bloque, archivos, destacados, conectados (con su
 * PROPIO scroll dentro del scroll del modal) y baneos. En un panel angosto eso
 * obligaba a recorrer casi mil pixeles para llegar al ultimo bloque, y nadie
 * llegaba.
 *
 * Ahora son cinco secciones detras de una barra horizontal de una sola linea.
 * La altura del cuerpo es FIJA y no minima: es lo unico que garantiza que
 * cambiar de pestana no haga saltar el modal ni mueva el foco de sitio.
 */

type SeccionId = 'descripcion' | 'reglas' | 'archivos' | 'destacados' | 'conectados';

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

  const [seccion, setSeccion] = useState<SeccionId>('descripcion');
  const [tipoDeArchivo, setTipoDeArchivo] = useState<'images' | 'files'>('images');
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(room.description || '');
  const [rules, setRules] = useState(room.rules || '');
  const [saving, setSaving] = useState(false);

  const fieldClass =
    'w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors focus:border-focus';

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

  const tabs: RoomInfoTab[] = [
    { id: 'descripcion', label: 'Descripción', icon: <ChatIcon.Document /> },
    { id: 'reglas', label: 'Reglas', icon: <ChatIcon.Shield /> },
    {
      id: 'archivos',
      label: 'Archivos',
      icon: <ChatIcon.Paperclip />,
      count: attachments.images.length + attachments.files.length,
    },
    { id: 'destacados', label: 'Destacados', icon: <ChatIcon.Star />, count: highlights.length },
    { id: 'conectados', label: 'Conectados', icon: <Icon.Users />, count: onlineCount },
  ];

  /** Botón de editar, compartido por Descripción y Reglas. */
  const botonEditar = isStaff && !editing && (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-meta font-semibold text-primary hover:underline"
    >
      Editar
    </button>
  );

  const formularioDeEdicion = (
    <div className="flex flex-col gap-2">
      <textarea
        value={seccion === 'reglas' ? rules : description}
        onChange={(e) =>
          seccion === 'reglas' ? setRules(e.target.value) : setDescription(e.target.value)
        }
        placeholder={seccion === 'reglas' ? 'Reglas de la sala…' : '¿De qué se trata esta sala?'}
        aria-label={seccion === 'reglas' ? 'Reglas de la sala' : 'Descripción de la sala'}
        rows={6}
        className={fieldClass}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );

  return (
    /*
      480 y no 420: es el ancho con el que los cinco rotulos de las pestanas
      entran escritos a partir de `panel-lg`. Ver el calculo en RoomInfoTabs.
    */
    <Modal onClose={onClose} maxWidth="480px" label={`Información de ${room.name}`}>
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-section-title font-semibold text-ink"># {room.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-micro text-ink-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-state-success" />
              {onlineCount} conectado{onlineCount === 1 ? '' : 's'}
            </p>
          </div>

          <IconButton icon={<Icon.Close />} label="Cerrar" onClick={onClose} size="sm" />
        </div>

        <div className="px-4">
          <RoomInfoTabs
            tabs={tabs}
            active={seccion}
            onChange={(id) => {
              setSeccion(id as SeccionId);
              setEditing(false);
            }}
          />
        </div>

        {/*
          Altura fija, no `min-h`: con una altura que dependa del contenido, ir
          de "Conectados" (larga) a "Reglas" (corta) encoge el modal de golpe y
          el cursor queda apuntando a otra cosa.
        */}
        <div
          role="tabpanel"
          id={`panel-${seccion}`}
          aria-labelledby={`tab-${seccion}`}
          tabIndex={0}
          className="h-[300px] overflow-y-auto px-4 pb-4 panel-md:h-[380px]"
        >
          {seccion === 'descripcion' &&
            (editing ? (
              formularioDeEdicion
            ) : room.description ? (
              <>
                <div className="mb-1 flex justify-end">{botonEditar}</div>
                <p className="whitespace-pre-wrap break-words text-body text-ink">
                  {room.description}
                </p>
              </>
            ) : (
              <EmptyState
                icon={<ChatIcon.Document />}
                title="Sin descripción"
                description="Esta sala todavía no tiene descripción."
                action={botonEditar || undefined}
              />
            ))}

          {seccion === 'reglas' &&
            (editing ? (
              formularioDeEdicion
            ) : room.rules ? (
              <>
                <div className="mb-1 flex justify-end">{botonEditar}</div>
                <p className="whitespace-pre-wrap break-words rounded-r-md border-l-2 border-accent-border bg-accent-soft py-2 pl-2 pr-2 text-body text-ink">
                  {room.rules}
                </p>
              </>
            ) : (
              <EmptyState
                icon={<ChatIcon.Shield />}
                title="Sin reglas"
                description="El staff todavía no publicó reglas para esta sala."
                action={botonEditar || undefined}
              />
            ))}

          {/*
            El selector Imagenes/Docs NO va en la barra de pestanas: ahi tendria
            que ir dentro del `<button>` de la pestana activa, y un boton dentro
            de otro boton es HTML invalido -el navegador lo reacomoda- y deja el
            control inalcanzable con teclado.

            Va aca, dentro de la seccion, y por eso no es una fila permanente:
            solo existe en Archivos. Como la altura del cuerpo es fija, aparecer
            no mueve nada de sitio.
          */}
          {seccion === 'archivos' && (
            <div className="sticky top-0 z-10 -mx-4 mb-2 bg-surface px-4 pb-2">
              <SegmentedControl
                label="Tipo de archivo"
                value={tipoDeArchivo}
                onChange={setTipoDeArchivo}
                options={[
                  { value: 'images', label: `Imágenes ${attachments.images.length}` },
                  { value: 'files', label: `Docs ${attachments.files.length}` },
                ]}
              />
            </div>
          )}

          {seccion === 'archivos' &&
            (tipoDeArchivo === 'images' ? (
              attachments.images.length === 0 ? (
                <EmptyState
                  icon={<ChatIcon.Paperclip />}
                  title="Sin imágenes"
                  description="Las que se compartan en la sala aparecen acá."
                />
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {attachments.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() =>
                        setExpandedImage({
                          src: attachmentPublicUrl(image.storage_path),
                          alt: image.file_name,
                        })
                      }
                      title={image.file_name}
                      aria-label={`Ampliar ${image.file_name}`}
                      className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-sunken"
                    >
                      <img
                        src={attachmentPublicUrl(image.storage_path)}
                        alt={image.file_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )
            ) : attachments.files.length === 0 ? (
              <EmptyState
                icon={<ChatIcon.Document />}
                title="Sin archivos"
                description="Los adjuntos de la sala aparecen acá."
              />
            ) : (
              <div className="space-y-1.5">
                {attachments.files.map((file) => (
                  <a
                    key={file.id}
                    href={attachmentPublicUrl(file.storage_path)}
                    target="_blank"
                    rel="noreferrer"
                    download={file.file_name}
                    className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 transition-colors hover:border-primary"
                  >
                    <span className="shrink-0 text-ink-muted">
                      <ChatIcon.Document />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-meta font-medium text-ink">
                      {file.file_name}
                    </span>
                    <span className="shrink-0 text-micro text-ink-muted">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </a>
                ))}
              </div>
            ))}

          {seccion === 'destacados' &&
            (highlights.length === 0 ? (
              <EmptyState
                icon={<ChatIcon.Star />}
                title="Sin destacados"
                description="Acá aparecen los mensajes que alguien marcó como importantes."
              />
            ) : (
              <HighlightedMessagesCarousel highlights={highlights} onRemove={onRemoveHighlight} />
            ))}

          {seccion === 'conectados' && (
            <div className="flex h-full flex-col gap-3">
              {/* `h-full` en vez del alto fijo que tenia: antes era un panel de
                  236px con su propio scroll DENTRO del scroll del modal. */}
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-line">
                <ChatMembersPanel
                  currentUserId={currentUserId}
                  search={memberSearch}
                  onSearchChange={onMemberSearchChange}
                  onOpenProfile={onOpenProfile}
                  onOpenDirectMessage={onOpenDirectMessage}
                />
              </div>

              {/* Los baneos no son una sexta pestana: son gente que NO esta en
                  la sala, y solo los ve el staff. Van al pie de conectados. */}
              {isStaff && activeBans.bans.length > 0 && (
                <div className="shrink-0 border-t border-line-soft pt-2">
                  <h3 className="mb-1.5 text-micro font-bold uppercase tracking-wider text-ink-muted">
                    Baneos activos ({activeBans.bans.length})
                  </h3>

                  <div className="space-y-1.5">
                    {activeBans.bans.map((ban) => (
                      <div
                        key={ban.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-state-danger-soft px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-meta font-semibold text-state-danger">
                            {ban.userName}
                          </p>
                          <p className="truncate text-micro text-ink-muted">
                            {ban.banned_until
                              ? `Hasta ${formatearFechaHora(ban.banned_until)}`
                              : 'Sin fecha de fin'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void activeBans.lift(ban.id)}
                          className="shrink-0 text-meta font-semibold text-primary hover:underline"
                        >
                          Levantar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {expandedImage && (
        <AttachmentLightbox
          src={expandedImage.src}
          alt={expandedImage.alt}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </Modal>
  );
}
