import { useRef, useState } from 'react';
import { getPlatform } from '../../platform/registry';
import { Button, Modal, SegmentedControl } from '../../design';
import { POST_BODY_MAX, POST_TITLE_MAX } from '../../services/communityForumService';
import type { CommunityCategory, CommunityPost, NewCommunityPost } from '../../types/community';
import { getErrorMessage } from '../../utils/errorMessage';
import PostBody from './PostBody';
import RichTextToolbar from './RichTextToolbar';

interface PostComposerProps {
  categories: CommunityCategory[];
  defaultCategoryId?: string;
  /**
   * Publicacion que se esta editando. Ausente, se crea una nueva.
   *
   * Es el mismo formulario para las dos cosas a proposito: las reglas de largo,
   * la barra de formato y la vista previa son identicas, y mantener dos
   * pantallas casi iguales es como se separan.
   */
  editing?: CommunityPost;
  onClose: () => void;
  onPublish: (post: NewCommunityPost) => Promise<void>;
}

/** Desde cuantos caracteres restantes aparece el contador del cuerpo. */
const AVISO_DE_LIMITE = 120;

/**
 * REDACCION DE UNA PUBLICACION
 *
 * El cuerpo admite formato: negrita, encabezados, viñetas, linea horizontal y
 * enlaces. Se escribe con marcas (`**negrita**`) y se comprueba en la pestana
 * de vista previa, que usa el MISMO `PostBody` con el que se dibuja despues en
 * el feed. Eso es deliberado: con dos caminos de dibujo distintos, lo que se
 * previsualiza y lo que se publica se separan tarde o temprano.
 *
 * Los comentarios NO llevan formato: siguen siendo texto plano. Mezclar los dos
 * modelos es la regresion mas facil de introducir aca por descuido.
 */
export default function PostComposer({
  categories,
  defaultCategoryId,
  editing,
  onClose,
  onPublish,
}: PostComposerProps) {
  const [categoryId, setCategoryId] = useState(
    editing?.category_id || defaultCategoryId || categories[0]?.id || ''
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [vista, setVista] = useState<'escribir' | 'previa'>('escribir');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const esEdicion = !!editing;

  /*
   * Al editar, "hay borrador" significa que se cambio algo, no que haya texto:
   * si no, cerrar sin tocar nada pediria confirmacion igual.
   */
  const hayBorrador = esEdicion
    ? title !== editing.title || body !== editing.body || categoryId !== editing.category_id
    : !!title.trim() || !!body.trim();
  const restantes = POST_BODY_MAX - body.length;

  /*
   * Cerrar descartaba titulo y cuerpo sin avisar: escribir cinco parrafos y
   * tocar fuera del modal por error los borraba sin vuelta atras.
   */
  const handleClose = async () => {
    if (
      hayBorrador &&
      !(await getPlatform().dialogs.confirm('Vas a perder lo que escribiste.', {
        title: '¿Cerrar sin publicar?',
        confirmLabel: 'Descartar',
        cancelLabel: 'Seguir escribiendo',
        tone: 'danger',
      }))
    ) {
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onPublish({ categoryId, title, body });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo publicar.'));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-focus';

  const labelClass = 'text-micro font-bold uppercase tracking-wider text-ink-muted';

  return (
    <Modal
      onClose={handleClose}
      maxWidth="560px"
      label={esEdicion ? 'Editar publicación' : 'Nueva publicación'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
        <h2 className="text-section-title font-semibold text-ink">
          {esEdicion ? 'Editar publicación' : 'Nueva publicación'}
        </h2>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Categoría</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={fieldClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Título</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={POST_TITLE_MAX}
            placeholder="¿De qué querés hablar?"
            className={fieldClass}
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>Contenido</span>

            <SegmentedControl
              label="Modo del editor"
              value={vista}
              onChange={setVista}
              options={[
                { value: 'escribir', label: 'Escribir' },
                { value: 'previa', label: 'Vista previa' },
              ]}
            />
          </div>

          {vista === 'escribir' ? (
            <>
              <RichTextToolbar textareaRef={bodyRef} value={body} onChange={setBody} />

              <textarea
                id="cuerpo-de-la-publicacion"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={POST_BODY_MAX}
                rows={8}
                placeholder="Compartí tu experiencia, consulta o consejo…"
                aria-label="Contenido de la publicación"
                className={`${fieldClass} resize-none`}
              />
            </>
          ) : (
            /*
              Alto minimo igual al del textarea para que alternar entre escribir
              y previsualizar no haga saltar el modal.
            */
            <div className="min-h-[196px] rounded-lg border border-line bg-surface-sunken px-3 py-2">
              {body.trim() ? (
                <PostBody body={body} />
              ) : (
                <p className="text-meta italic text-ink-muted">
                  Todavía no escribiste nada. Lo que escribas se va a ver acá con su formato.
                </p>
              )}
            </div>
          )}

          {restantes <= AVISO_DE_LIMITE && (
            <span className="self-end text-micro text-ink-muted">Quedan {restantes}</span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-meta font-medium text-state-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !title.trim() || !body.trim()}>
            {saving
              ? esEdicion
                ? 'Guardando…'
                : 'Publicando…'
              : esEdicion
                ? 'Guardar cambios'
                : 'Publicar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
