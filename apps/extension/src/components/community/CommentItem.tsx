import { useState } from 'react';
import { Avatar, Button } from '../../design';
import { ChatIcon } from '../chat/ChatIcons';
import ChatMenuSurface, { ChatMenuItem } from '../chat/ChatMenuSurface';
import CommentReactionBar, { CommentReactionPicker } from './CommentReactionBar';
import { formatearTiempoRelativo } from '../../utils/date';
import { COMMENT_MAX } from '../../services/communityForumService';
import type {
  CommunityCommentNode,
  CommunityReactionKind,
  CommunityReactionSummary,
} from '../../types/community';

/**
 * UN COMENTARIO Y SU HILO
 *
 * ## La sangria y su tope
 *
 * 16px por nivel, y como mucho dos sangrias. La burbuja de nivel 0 mide 212px
 * en un panel de 320; a la tercera sangria quedarian 164, que a 13px son unos
 * 24 caracteres por linea. La base ya tapa la profundidad en 2 (migracion 121),
 * asi que el boton de responder desaparece en el ultimo nivel: mostrarlo y que
 * el servidor rechace el envio seria peor que no ofrecerlo.
 */

const SANGRIA_POR_NIVEL = 16;
const PROFUNDIDAD_MAXIMA = 2;

export interface CommentItemProps {
  node: CommunityCommentNode;
  currentUserId?: string;
  isStaff: boolean;
  reactions: Map<string, CommunityReactionSummary[]>;
  onReply: (parentId: string, body: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, reaction: CommunityReactionKind) => void;
}

export default function CommentItem({
  node,
  currentUserId,
  isStaff,
  reactions,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: CommentItemProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [reaccionesAbiertas, setReaccionesAbiertas] = useState(false);
  const [respondiendo, setRespondiendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);

  const eliminado = !!node.deleted_at;
  const esMio = node.author_id === currentUserId;
  const nivel = node.depth ?? 0;
  const puedeResponder = !eliminado && nivel < PROFUNDIDAD_MAXIMA;
  const autor = node.author?.full_name || 'Usuario';

  const enviar = async (accion: () => Promise<void>) => {
    setEnviando(true);
    try {
      await accion();
      setRespondiendo(false);
      setEditando(false);
      setBorrador('');
    } finally {
      setEnviando(false);
    }
  };

  const campo = (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <textarea
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        maxLength={COMMENT_MAX}
        rows={2}
        autoFocus
        placeholder={editando ? 'Editá tu comentario…' : `Respondele a ${autor}…`}
        aria-label={editando ? 'Editar comentario' : 'Responder al comentario'}
        className="w-full resize-none rounded-lg border border-line bg-surface px-2.5 py-1.5 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-focus"
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRespondiendo(false);
            setEditando(false);
            setBorrador('');
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={enviando || !borrador.trim()}
          onClick={() =>
            void enviar(() =>
              editando ? onEdit(node.id, borrador) : onReply(node.id, borrador)
            )
          }
        >
          {enviando ? 'Enviando…' : editando ? 'Guardar' : 'Responder'}
        </Button>
      </div>
    </div>
  );

  return (
    <li className="list-none">
      <div className="flex gap-2">
        <Avatar
          name={autor}
          src={node.author?.avatar_url}
          size="sm"
          premium={!!node.author?.show_premium_frame}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1">
          <div className="rounded-lg rounded-tl-sm bg-surface-sunken px-2.5 py-1.5">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 truncate text-micro font-semibold text-ink">{autor}</span>
              <span className="shrink-0 text-micro text-ink-muted">
                {formatearTiempoRelativo(node.created_at)}
                {node.edited_at && <span className="ml-1 italic">· editado</span>}
              </span>
            </div>

            <p
              className={`mt-0.5 whitespace-pre-wrap break-words text-body ${
                eliminado ? 'italic text-ink-muted' : 'text-ink'
              }`}
            >
              {node.body}
            </p>
          </div>

          {!eliminado && (
            <div className="relative mt-1 flex items-center gap-1">
              <CommentReactionBar
                reactions={reactions.get(node.id) ?? []}
                onToggle={(reaction) => onReact(node.id, reaction)}
              />

              {/* Carita y tres puntos, mismo modelo que el chat. */}
              <button
                type="button"
                onClick={() => setReaccionesAbiertas((abierto) => !abierto)}
                aria-label="Reaccionar"
                aria-expanded={reaccionesAbiertas}
                title="Reaccionar"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-hover ${
                  reaccionesAbiertas ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <ChatIcon.Smiley className="h-3.5 w-3.5" />
              </button>

              {reaccionesAbiertas && (
                <span className="flex items-center rounded-full border border-line bg-surface p-0.5 shadow-card">
                  <CommentReactionPicker
                    reactions={reactions.get(node.id) ?? []}
                    onToggle={(reaction) => {
                      onReact(node.id, reaction);
                      setReaccionesAbiertas(false);
                    }}
                  />
                </span>
              )}

              {puedeResponder && (
                <button
                  type="button"
                  onClick={() => {
                    setRespondiendo(true);
                    setEditando(false);
                    setBorrador('');
                  }}
                  className="shrink-0 px-1 text-micro font-semibold text-ink-muted transition-colors hover:text-primary"
                >
                  Responder
                </button>
              )}

              {(esMio || isStaff) && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuAbierto((abierto) => !abierto)}
                    aria-label="Acciones del comentario"
                    aria-expanded={menuAbierto}
                    title="Acciones del comentario"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <ChatIcon.More className="h-3.5 w-3.5" />
                  </button>

                  {menuAbierto && (
                    <ChatMenuSurface
                      onClose={() => setMenuAbierto(false)}
                      align="left"
                      width="w-40"
                      label="Acciones del comentario"
                    >
                      {/* Solo el autor edita: reescribir lo que dijo otra
                          persona en su nombre es distinto de moderarlo. */}
                      {esMio && (
                        <ChatMenuItem
                          onClick={() => {
                            setMenuAbierto(false);
                            setEditando(true);
                            setRespondiendo(false);
                            setBorrador(node.body);
                          }}
                        >
                          Editar
                        </ChatMenuItem>
                      )}

                      <ChatMenuItem
                        onClick={() => {
                          setMenuAbierto(false);
                          void onDelete(node.id);
                        }}
                        tone="danger"
                        icon={<ChatIcon.Trash />}
                      >
                        Eliminar
                      </ChatMenuItem>
                    </ChatMenuSurface>
                  )}
                </div>
              )}
            </div>
          )}

          {(respondiendo || editando) && campo}
        </div>
      </div>

      {node.children.length > 0 && (
        <ul
          className="mt-2 space-y-2 border-l border-line-soft pl-2"
          style={{ marginLeft: SANGRIA_POR_NIVEL }}
        >
          {node.children.map((hijo) => (
            <CommentItem
              key={hijo.id}
              node={hijo}
              currentUserId={currentUserId}
              isStaff={isStaff}
              reactions={reactions}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
