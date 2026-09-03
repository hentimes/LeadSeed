import { useState } from 'react';
import { Button, Modal } from '../../design';
// Se reutiliza la superficie de menu del chat en vez de repetirla: ya resuelve
// el cierre con Escape, el foco que entra y vuelve, y el volteo cuando no cabe.
// Deberia acabar en `design/` cuando haya un tercer consumidor.
import ChatMenuSurface, { ChatMenuItem } from '../chat/ChatMenuSurface';
import { ChatIcon } from '../chat/ChatIcons';
import { REPORT_REASON_MAX } from '../../services/communityForumService';
import { getErrorMessage } from '../../utils/errorMessage';

/**
 * ACCIONES SOBRE UNA PUBLICACION: editar, eliminar y denunciar.
 *
 * No existian. Una publicacion se creaba y ya: ni su autor podia corregir una
 * palabra, ni el staff sacar algo que no correspondia, ni el resto avisar de un
 * problema. En un foro eso no es una carencia de comodidad, es que no hay
 * moderacion.
 *
 * Quien puede hacer que lo decide la base, no este componente: las politicas
 * "Authors or staff update/delete community posts" de la migracion 074. Aca
 * solo se esconde lo que igual seria rechazado, para no ofrecer un boton que
 * falla al tocarlo.
 */
export default function PostActionsMenu({
  canEdit,
  canDelete,
  canReport,
  onEdit,
  onDelete,
  onReport,
}: {
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onReport: (reason: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmaBorrado, setConfirmaBorrado] = useState(false);
  const [formularioDenuncia, setFormularioDenuncia] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [denunciado, setDenunciado] = useState(false);

  if (!canEdit && !canDelete && !canReport) return null;

  const ejecutar = async (accion: () => Promise<void>, alTerminar: () => void) => {
    setEnviando(true);
    setError('');

    try {
      await accion();
      alTerminar();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo completar la acción.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label="Acciones de la publicación"
        aria-expanded={abierto}
        title="Acciones de la publicación"
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <ChatIcon.More className="h-4 w-4" />
      </button>

      {abierto && (
        <ChatMenuSurface
          onClose={() => setAbierto(false)}
          align="right"
          width="w-44"
          label="Acciones de la publicación"
        >
          {canEdit && (
            <ChatMenuItem
              onClick={() => {
                setAbierto(false);
                onEdit();
              }}
            >
              Editar
            </ChatMenuItem>
          )}

          {canReport && (
            <ChatMenuItem
              onClick={() => {
                setAbierto(false);
                setFormularioDenuncia(true);
              }}
              icon={<ChatIcon.Flag />}
            >
              {denunciado ? 'Ya la denunciaste' : 'Denunciar'}
            </ChatMenuItem>
          )}

          {canDelete && (
            <ChatMenuItem
              onClick={() => {
                setAbierto(false);
                setConfirmaBorrado(true);
              }}
              tone="danger"
              icon={<ChatIcon.Trash />}
            >
              Eliminar
            </ChatMenuItem>
          )}
        </ChatMenuSurface>
      )}

      {confirmaBorrado && (
        <Modal onClose={() => setConfirmaBorrado(false)} maxWidth="380px" label="Eliminar publicación">
          <div className="flex flex-col gap-3 p-4">
            <h2 className="text-section-title font-semibold text-ink">Eliminar la publicación</h2>
            <p className="text-body text-ink-secondary">
              Se borra junto con todos sus comentarios. No se puede deshacer.
            </p>

            {error && (
              <p role="alert" className="text-meta font-medium text-state-danger">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmaBorrado(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={enviando}
                onClick={() => void ejecutar(onDelete, () => setConfirmaBorrado(false))}
              >
                {enviando ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {formularioDenuncia && (
        <Modal
          onClose={() => setFormularioDenuncia(false)}
          maxWidth="380px"
          label="Denunciar publicación"
        >
          <div className="flex flex-col gap-3 p-4">
            <h2 className="text-section-title font-semibold text-ink">Denunciar la publicación</h2>
            <p className="text-body text-ink-secondary">
              La revisa el equipo. Contanos qué pasa para que puedan entenderlo sin escribirte.
            </p>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={REPORT_REASON_MAX}
              rows={3}
              placeholder="¿Por qué la denunciás? (opcional)"
              aria-label="Motivo de la denuncia"
              className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-focus"
            />

            {error && (
              <p role="alert" className="text-meta font-medium text-state-danger">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormularioDenuncia(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={enviando}
                onClick={() =>
                  void ejecutar(
                    () => onReport(motivo),
                    () => {
                      setFormularioDenuncia(false);
                      setMotivo('');
                      // Se recuerda en el propio componente: la tabla no se
                      // puede leer desde el cliente (solo la ve el staff), asi
                      // que no hay forma de preguntar si ya estaba denunciada.
                      setDenunciado(true);
                    }
                  )
                }
              >
                {enviando ? 'Enviando…' : 'Denunciar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
